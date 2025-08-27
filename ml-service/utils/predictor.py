import json

class BunkPredictor:
    def __init__(self):
        self.model = None
        self.scaler = None
        print("✅ BunkPredictor initialized with rule-based logic")
    
    def predict(self, features, has_upcoming_exams=True):
        """
        Simple rule-based prediction logic
        features: [attendance_percentage, days_until_exam, syllabus_completion, past_performance]
        has_upcoming_exams: Boolean indicating if there are actual upcoming exams
        """
        try:
            attendance_pct = features[0]
            days_until_exam = features[1] 
            syllabus_completion = features[2]
            past_performance = features[3]
            
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
            
        except Exception as e:
            return {
                'prediction': 'Not Safe',
                'confidence': 0.5,
                'risk_level': 'high',
                'error': str(e),
                'explanation': 'Error in prediction calculation'
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
