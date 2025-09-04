import json
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.logistic_model import BunkPredictionModel

class BunkPredictor:
    def __init__(self):
        self.ml_model = BunkPredictionModel()
        self.model_path = '/home/satyendra9580/Desktop/should/ml-service/models/trained_model.pkl'
        self.use_ml = False
        
        # Try to load ML model
        try:
            if os.path.exists(self.model_path):
                self.ml_model.load_model(self.model_path)
                self.use_ml = True
                print("✅ BunkPredictor initialized with Logistic Regression ML model")
            else:
                print("⚠️ ML model not found, falling back to rule-based logic")
        except Exception as e:
            print(f"⚠️ Failed to load ML model: {e}, using rule-based logic")
            self.use_ml = False
    
    def predict(self, features, has_upcoming_exams=True):
        """
        Predict using ML model if available, otherwise fall back to rule-based logic
        features: [attendance_percentage, days_until_exam, syllabus_completion, past_performance]
        has_upcoming_exams: Boolean indicating if there are actual upcoming exams
        """
        try:
            attendance_pct = features[0]
            days_until_exam = features[1] 
            syllabus_completion = features[2]
            past_performance = features[3]
            
            # Use ML model if available
            if self.use_ml:
                return self._predict_with_ml(features, has_upcoming_exams)
            else:
                return self._predict_with_rules(features, has_upcoming_exams)
                
        except Exception as e:
            return {
                'prediction': 'Not Safe',
                'confidence': 0.5,
                'risk_level': 'high',
                'error': str(e),
                'explanation': 'Error in prediction calculation'
            }
    
    def _predict_with_ml(self, features, has_upcoming_exams=True):
        """Make prediction using the ML model"""
        attendance_pct, days_until_exam, syllabus_completion, past_performance = features
        
        # Prepare features for ML model
        ml_features = {
            'attendance_pct': attendance_pct,
            'days_until_exam': days_until_exam,
            'syllabus_completion': syllabus_completion,
            'past_performance': past_performance,
            'attendance_normalized': attendance_pct / 100,
            'exam_urgency': 1 / (days_until_exam + 1),
            'syllabus_normalized': syllabus_completion / 100,
            'performance_normalized': past_performance / 100,
            'attendance_syllabus_interaction': (attendance_pct / 100) * (syllabus_completion / 100),
            'exam_preparation_score': (syllabus_completion / 100) * days_until_exam / 30
        }
        
        # Get ML prediction
        result = self.ml_model.predict(ml_features)
        
        # Add additional context for no upcoming exams
        if not has_upcoming_exams:
            result['explanation'] += "; 📅 No upcoming exams - safer to bunk"
            # Boost probability slightly if no exams
            if result['probability_safe'] > 0.3:
                result['probability_safe'] = min(0.9, result['probability_safe'] + 0.2)
                if result['probability_safe'] >= 0.7:
                    result['prediction'] = "Safe to Bunk"
                    result['risk_level'] = "low"
        
        return result
    
    def _predict_with_rules(self, features, has_upcoming_exams=True):
        """Fallback rule-based prediction logic"""
        attendance_pct, days_until_exam, syllabus_completion, past_performance = features
        
        # Special case: No upcoming exams
        if not has_upcoming_exams:
            if attendance_pct >= 85:
                recommendation = "Safe to Bunk"
                confidence = 0.85
                risk_level = "low"
            elif attendance_pct >= 75:
                recommendation = "Moderate Risk"
                confidence = 0.65
                risk_level = "medium"
            else:
                recommendation = "Not Safe"
                confidence = 0.70
                risk_level = "high"
        else:
            # Rule-based logic for bunk recommendation when exams exist
            # PRIORITY 1: Immediate exams (0-2 days) - ALWAYS "Not Safe"
            if days_until_exam <= 2:
                recommendation = "Not Safe"
                confidence = 0.95
                risk_level = "high"
            # PRIORITY 2: Very close exams (3-5 days) - High risk unless perfect conditions
            elif days_until_exam <= 5:
                if attendance_pct >= 90 and syllabus_completion >= 95:
                    recommendation = "Moderate Risk"
                    confidence = 0.70
                    risk_level = "medium"
                else:
                    recommendation = "Not Safe"
                    confidence = 0.85
                    risk_level = "high"
            # PRIORITY 3: Close exams (6-10 days) - Consider attendance and syllabus
            elif days_until_exam <= 10:
                if attendance_pct >= 85 and syllabus_completion >= 80:
                    recommendation = "Moderate Risk"
                    confidence = 0.65
                    risk_level = "medium"
                else:
                    recommendation = "Not Safe"
                    confidence = 0.75
                    risk_level = "high"
            # PRIORITY 4: Distant exams (>10 days) - Normal logic
            else:
                if attendance_pct >= 85 and syllabus_completion >= 70:
                    recommendation = "Safe to Bunk"
                    confidence = 0.80
                    risk_level = "low"
                elif attendance_pct >= 75 and syllabus_completion >= 60:
                    recommendation = "Moderate Risk"
                    confidence = 0.60
                    risk_level = "medium"
                else:
                    recommendation = "Not Safe"
                    confidence = 0.70
                    risk_level = "high"
        
        # Generate explanation
        explanation = self._generate_explanation(
            attendance_pct, days_until_exam, syllabus_completion, past_performance, has_upcoming_exams
        )
        
        return {
            'prediction': recommendation,
            'confidence': confidence,
            'risk_level': risk_level,
            'factors': {
                'attendance': attendance_pct,
                'exam_proximity': days_until_exam,
                'syllabus_progress': syllabus_completion,
                'past_performance': past_performance
            },
            'explanation': explanation
        }
    
    def _generate_explanation(self, attendance, exam_days, syllabus, performance, has_upcoming_exams=True):
        """Generate human-readable explanation for the prediction"""
        explanations = []
        
        if attendance >= 85:
            explanations.append(f"✅ Good attendance ({attendance}%)")
        elif attendance >= 75:
            explanations.append(f"⚠️ Moderate attendance ({attendance}%)")
        else:
            explanations.append(f"❌ Low attendance ({attendance}%)")
        
        # Handle exam proximity based on whether there are actual upcoming exams
        if not has_upcoming_exams:
            explanations.append("📅 No upcoming exams scheduled")
        elif exam_days <= 1:
            explanations.append(f"🚨 EXAM IS TODAY/TOMORROW - CRITICAL!")
        elif exam_days <= 2:
            explanations.append(f"🚨 Exam is only {exam_days} days away - URGENT!")
        elif exam_days <= 5:
            explanations.append(f"⚠️ Exam is only {exam_days} days away - HIGH RISK")
        elif exam_days <= 10:
            explanations.append(f"⚠️ Exam is {exam_days} days away - MODERATE RISK")
        else:
            explanations.append(f"✅ Exam is {exam_days} days away - SAFE DISTANCE")
        
        if syllabus >= 80:
            explanations.append(f"✅ Good syllabus progress ({syllabus}%)")
        elif syllabus >= 60:
            explanations.append(f"⚠️ Moderate syllabus progress ({syllabus}%)")
        else:
            explanations.append(f"❌ Low syllabus progress ({syllabus}%)")
        
        return "; ".join(explanations)
    
    def batch_predict(self, features_list):
        """Predict for multiple feature sets"""
        return [self.predict(features) for features in features_list]
    
    def get_model_info(self):
        """Return information about the prediction model"""
        return {
            'model_type': 'Rule-based Logic',
            'version': '1.0',
            'features': [
                'attendance_percentage',
                'days_until_exam', 
                'syllabus_completion',
                'past_performance'
            ],
            'output_classes': ['Safe to Bunk', 'Moderate Risk', 'Not Safe']
        }
