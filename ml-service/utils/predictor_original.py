import joblib
import numpy as np
import pandas as pd
import shap
import lime
import lime.tabular
from sklearn.preprocessing import StandardScaler
import os

class BunkPredictor:
    def __init__(self, model_path='models/bunk_predictor.joblib', scaler_path='models/scaler.joblib'):
        """Initialize the bunk predictor with trained model and scaler"""
        self.model_path = model_path
        self.scaler_path = scaler_path
        self.feature_names_path = 'models/feature_names.joblib'
        
        self.model = None
        self.scaler = None
        self.feature_names = None
        self.explainer = None
        
        self.load_model()
    
    def load_model(self):
        """Load the trained model, scaler, and feature names"""
        try:
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
                print("Model loaded successfully")
            else:
                print("Model file not found. Please train the model first.")
                return False
            
            if os.path.exists(self.scaler_path):
                self.scaler = joblib.load(self.scaler_path)
                print("Scaler loaded successfully")
            else:
                print("Scaler file not found. Please train the model first.")
                return False
            
            if os.path.exists(self.feature_names_path):
                self.feature_names = joblib.load(self.feature_names_path)
                print("Feature names loaded successfully")
            else:
                self.feature_names = ['attendance_percentage', 'exam_proximity', 'syllabus_completion', 'past_performance']
                print("Using default feature names")
            
            # Initialize SHAP explainer
            self._initialize_explainer()
            
            return True
            
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            return False
    
    def _initialize_explainer(self):
        """Initialize SHAP explainer for model interpretability"""
        try:
            # Create a small background dataset for SHAP
            background_data = np.array([
                [75, 0.3, 60, 70],  # Average student
                [85, 0.1, 80, 85],  # Good student
                [65, 0.8, 40, 60],  # Struggling student
                [90, 0.2, 90, 90],  # Excellent student
                [70, 0.6, 50, 65]   # Below average student
            ])
            
            background_data_scaled = self.scaler.transform(background_data)
            self.explainer = shap.LinearExplainer(self.model, background_data_scaled, feature_names=self.feature_names)
            print("SHAP explainer initialized successfully")
            
        except Exception as e:
            print(f"Warning: Could not initialize SHAP explainer: {str(e)}")
            self.explainer = None
    
    def predict(self, attendance_percentage, exam_proximity, syllabus_completion, past_performance):
        """
        Make a prediction for whether it's safe to bunk
        
        Args:
            attendance_percentage (float): Current attendance percentage (0-100)
            exam_proximity (float): Exam proximity score (0-1, higher = closer)
            syllabus_completion (float): Syllabus completion percentage (0-100)
            past_performance (float): Past performance score (0-100)
        
        Returns:
            dict: Prediction results with recommendation, probability, and explanation
        """
        if not self.model or not self.scaler:
            return self._fallback_prediction(attendance_percentage, exam_proximity, syllabus_completion, past_performance)
        
        try:
            # Prepare input data
            input_data = np.array([[attendance_percentage, exam_proximity, syllabus_completion, past_performance]])
            input_data_scaled = self.scaler.transform(input_data)
            
            # Make prediction
            prediction = self.model.predict(input_data_scaled)[0]
            probability = self.model.predict_proba(input_data_scaled)[0]
            
            # Get probability for positive class (safe to bunk)
            bunk_probability = probability[1]
            
            # Determine recommendation and risk level
            if bunk_probability >= 0.7:
                recommendation = "Safe to Bunk"
                risk_level = "low"
            elif bunk_probability >= 0.4:
                recommendation = "Moderate Risk"
                risk_level = "medium"
            else:
                recommendation = "Not Safe"
                risk_level = "high"
            
            # Get explanation factors
            factors = self._get_prediction_factors(input_data_scaled[0], bunk_probability)
            explanation = self._generate_explanation(attendance_percentage, exam_proximity, syllabus_completion, past_performance, bunk_probability)
            
            return {
                "recommendation": recommendation,
                "probability": round(bunk_probability, 3),
                "risk_level": risk_level,
                "factors": factors,
                "explanation": explanation,
                "model_confidence": round(max(probability), 3)
            }
            
        except Exception as e:
            print(f"Prediction error: {str(e)}")
            return self._fallback_prediction(attendance_percentage, exam_proximity, syllabus_completion, past_performance)
    
    def _get_prediction_factors(self, input_data_scaled, probability):
        """Get the factors contributing to the prediction using SHAP"""
        factors = []
        
        try:
            if self.explainer:
                # Get SHAP values
                shap_values = self.explainer.shap_values(input_data_scaled.reshape(1, -1))
                
                # Get feature contributions
                feature_contributions = list(zip(self.feature_names, shap_values[0]))
                feature_contributions.sort(key=lambda x: abs(x[1]), reverse=True)
                
                for feature, contribution in feature_contributions:
                    if abs(contribution) > 0.01:  # Only include significant contributions
                        direction = "increases" if contribution > 0 else "decreases"
                        factors.append(f"{feature.replace('_', ' ').title()} {direction} bunk safety")
            
            else:
                # Fallback factor analysis
                input_data = self.scaler.inverse_transform(input_data_scaled.reshape(1, -1))[0]
                attendance, exam_prox, syllabus, performance = input_data
                
                if attendance >= 80:
                    factors.append("Good attendance supports bunking")
                elif attendance < 70:
                    factors.append("Low attendance discourages bunking")
                
                if exam_prox > 0.6:
                    factors.append("Upcoming exam discourages bunking")
                elif exam_prox < 0.2:
                    factors.append("No immediate exam supports bunking")
                
                if syllabus >= 70:
                    factors.append("Good syllabus progress supports bunking")
                elif syllabus < 50:
                    factors.append("Poor syllabus progress discourages bunking")
                
                if performance >= 80:
                    factors.append("Strong past performance supports bunking")
                elif performance < 60:
                    factors.append("Weak past performance discourages bunking")
        
        except Exception as e:
            print(f"Error getting factors: {str(e)}")
            factors = ["Unable to analyze contributing factors"]
        
        return factors[:4]  # Return top 4 factors
    
    def _generate_explanation(self, attendance, exam_proximity, syllabus, performance, probability):
        """Generate human-readable explanation for the prediction"""
        explanations = []
        
        if probability >= 0.7:
            explanations.append("Your academic metrics indicate it's relatively safe to skip this class.")
            
            if attendance >= 80:
                explanations.append(f"Your attendance is strong at {attendance:.1f}%.")
            if exam_proximity < 0.3:
                explanations.append("No immediate exams are scheduled.")
            if syllabus >= 70:
                explanations.append(f"You've completed {syllabus:.1f}% of the syllabus.")
                
        elif probability >= 0.4:
            explanations.append("There's moderate risk in bunking this class. Consider your priorities.")
            
            if attendance < 75:
                explanations.append(f"Your attendance at {attendance:.1f}% is concerning.")
            if exam_proximity > 0.5:
                explanations.append("You have an exam coming up soon.")
                
        else:
            explanations.append("It's not recommended to bunk this class.")
            
            if attendance < 70:
                explanations.append(f"Your attendance at {attendance:.1f}% is below acceptable levels.")
            if exam_proximity > 0.6:
                explanations.append("You have an important exam very soon.")
            if syllabus < 50:
                explanations.append(f"You've only completed {syllabus:.1f}% of the syllabus.")
        
        return " ".join(explanations)
    
    def _fallback_prediction(self, attendance, exam_proximity, syllabus, performance):
        """Fallback prediction logic when ML model is unavailable"""
        score = 0
        factors = []
        
        # Simple rule-based scoring
        if attendance >= 85:
            score += 0.4
            factors.append("Excellent attendance supports bunking")
        elif attendance >= 75:
            score += 0.2
            factors.append("Good attendance supports bunking")
        elif attendance < 65:
            score -= 0.3
            factors.append("Poor attendance discourages bunking")
        
        if exam_proximity < 0.2:
            score += 0.3
            factors.append("No immediate exam supports bunking")
        elif exam_proximity > 0.7:
            score -= 0.4
            factors.append("Upcoming exam discourages bunking")
        
        if syllabus >= 80:
            score += 0.2
            factors.append("Strong syllabus progress supports bunking")
        elif syllabus < 40:
            score -= 0.2
            factors.append("Poor syllabus progress discourages bunking")
        
        if performance >= 85:
            score += 0.1
            factors.append("Excellent past performance supports bunking")
        elif performance < 60:
            score -= 0.1
            factors.append("Poor past performance discourages bunking")
        
        probability = max(0, min(1, (score + 0.5)))  # Normalize to 0-1
        
        if probability >= 0.7:
            recommendation = "Safe to Bunk"
            risk_level = "low"
        elif probability >= 0.4:
            recommendation = "Moderate Risk"
            risk_level = "medium"
        else:
            recommendation = "Not Safe"
            risk_level = "high"
        
        explanation = f"Based on rule-based analysis (ML model unavailable), your bunk safety score is {probability:.2f}."
        
        return {
            "recommendation": recommendation,
            "probability": round(probability, 3),
            "risk_level": risk_level,
            "factors": factors[:4],
            "explanation": explanation,
            "model_confidence": 0.8  # Fixed confidence for rule-based
        }
    
    def get_feature_importance(self):
        """Get feature importance from the trained model"""
        if not self.model:
            return None
        
        try:
            importance = abs(self.model.coef_[0])
            feature_importance = dict(zip(self.feature_names, importance))
            return sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
        except Exception as e:
            print(f"Error getting feature importance: {str(e)}")
            return None
