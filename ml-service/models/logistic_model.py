import numpy as np
import pandas as pd
import json
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, roc_curve
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
import os

class BunkPredictionModel:
    def __init__(self):
        self.model = LogisticRegression(
            random_state=42,
            max_iter=1000,
            solver='liblinear'  # Good for small datasets
        )
        self.scaler = StandardScaler()
        self.feature_names = [
            'attendance_normalized',
            'exam_urgency', 
            'syllabus_normalized',
            'performance_normalized',
            'attendance_syllabus_interaction',
            'exam_preparation_score'
        ]
        self.is_trained = False
        self.model_metrics = {}
        self.feature_importance = {}
        
    def prepare_features(self, data):
        """Extract and prepare features for training/prediction"""
        if isinstance(data, dict):
            # Single prediction
            features = np.array([[
                data['attendance_normalized'],
                data['exam_urgency'],
                data['syllabus_normalized'], 
                data['performance_normalized'],
                data['attendance_syllabus_interaction'],
                data['exam_preparation_score']
            ]])
        else:
            # Batch data (DataFrame or list of dicts)
            if isinstance(data, list):
                df = pd.DataFrame(data)
            else:
                df = data
                
            features = df[self.feature_names].values
            
        return features
    
    def train(self, training_data_path):
        """Train the logistic regression model"""
        print("🔄 Loading training data...")
        
        # Load training data
        with open(training_data_path, 'r') as f:
            data = json.load(f)
        
        df = pd.DataFrame(data)
        print(f"📊 Loaded {len(df)} training samples")
        
        # Prepare features and target
        X = self.prepare_features(df)
        y = df['outcome'].values
        
        print(f"🎯 Feature matrix shape: {X.shape}")
        print(f"📈 Target distribution: {np.bincount(y)}")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Scale features
        print("⚖️ Scaling features...")
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        print("🤖 Training logistic regression model...")
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate model
        train_score = self.model.score(X_train_scaled, y_train)
        test_score = self.model.score(X_test_scaled, y_test)
        
        # Cross-validation
        cv_scores = cross_val_score(self.model, X_train_scaled, y_train, cv=5)
        
        # Predictions for detailed metrics
        y_pred = self.model.predict(X_test_scaled)
        y_pred_proba = self.model.predict_proba(X_test_scaled)[:, 1]
        
        # Calculate metrics
        auc_score = roc_auc_score(y_test, y_pred_proba)
        
        self.model_metrics = {
            'train_accuracy': round(train_score, 4),
            'test_accuracy': round(test_score, 4),
            'cv_mean': round(cv_scores.mean(), 4),
            'cv_std': round(cv_scores.std(), 4),
            'auc_score': round(auc_score, 4),
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'trained_at': datetime.now().isoformat()
        }
        
        # Feature importance (coefficients)
        coefficients = self.model.coef_[0]
        self.feature_importance = {
            name: round(coef, 4) 
            for name, coef in zip(self.feature_names, coefficients)
        }
        
        self.is_trained = True
        
        print("✅ Model training completed!")
        print(f"📊 Training accuracy: {train_score:.3f}")
        print(f"📊 Test accuracy: {test_score:.3f}")
        print(f"📊 Cross-validation: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")
        print(f"📊 AUC Score: {auc_score:.3f}")
        
        # Print feature importance
        print("\n🔍 Feature Importance (Coefficients):")
        for name, coef in self.feature_importance.items():
            direction = "↑" if coef > 0 else "↓"
            print(f"  {name}: {coef:+.4f} {direction}")
        
        return self.model_metrics
    
    def predict(self, features_dict):
        """Make prediction for a single instance"""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        # Prepare features
        X = self.prepare_features(features_dict)
        X_scaled = self.scaler.transform(X)
        
        # Get prediction and probability
        prediction = self.model.predict(X_scaled)[0]
        probabilities = self.model.predict_proba(X_scaled)[0]
        
        prob_not_safe = probabilities[0]
        prob_safe = probabilities[1]
        
        # Determine recommendation based on probability
        if prob_safe >= 0.7:
            recommendation = "Safe to Bunk"
            risk_level = "low"
        elif prob_safe >= 0.4:
            recommendation = "Moderate Risk"
            risk_level = "medium"
        else:
            recommendation = "Not Safe"
            risk_level = "high"
        
        # Generate explanation
        explanation = self._generate_ml_explanation(features_dict, probabilities)
        
        return {
            'prediction': recommendation,
            'confidence': round(max(prob_safe, prob_not_safe), 4),
            'probability_safe': round(prob_safe, 4),
            'probability_not_safe': round(prob_not_safe, 4),
            'risk_level': risk_level,
            'factors': {
                'attendance': features_dict.get('attendance_pct', 0),
                'exam_proximity': features_dict.get('days_until_exam', 0),
                'syllabus_progress': features_dict.get('syllabus_completion', 0),
                'past_performance': features_dict.get('past_performance', 0)
            },
            'explanation': explanation,
            'model_type': 'Logistic Regression'
        }
    
    def _generate_ml_explanation(self, features, probabilities):
        """Generate explanation based on ML model predictions"""
        explanations = []
        prob_safe = probabilities[1]
        
        # Feature contributions (simplified)
        attendance = features.get('attendance_pct', 0)
        days_until_exam = features.get('days_until_exam', 0)
        syllabus = features.get('syllabus_completion', 0)
        
        # Attendance analysis
        if attendance >= 85:
            explanations.append(f"✅ Good attendance ({attendance}%) increases safety")
        elif attendance >= 75:
            explanations.append(f"⚠️ Moderate attendance ({attendance}%) - neutral impact")
        else:
            explanations.append(f"❌ Low attendance ({attendance}%) decreases safety")
        
        # Exam proximity analysis
        if days_until_exam <= 3:
            explanations.append(f"🚨 Exam very close ({days_until_exam} days) - high risk")
        elif days_until_exam <= 7:
            explanations.append(f"⚠️ Exam approaching ({days_until_exam} days) - moderate risk")
        else:
            explanations.append(f"✅ Exam distant ({days_until_exam} days) - lower risk")
        
        # Syllabus analysis
        if syllabus >= 80:
            explanations.append(f"✅ Good preparation ({syllabus}%) helps safety")
        elif syllabus >= 60:
            explanations.append(f"⚠️ Moderate preparation ({syllabus}%) - some risk")
        else:
            explanations.append(f"❌ Low preparation ({syllabus}%) increases risk")
        
        # Overall probability
        explanations.append(f"🎯 ML Confidence: {prob_safe:.1%} chance it's safe")
        
        return "; ".join(explanations)
    
    def get_feature_importance(self):
        """Get feature importance scores"""
        if not self.is_trained:
            return {}
        return self.feature_importance
    
    def get_model_info(self):
        """Get model information and metrics"""
        info = {
            'model_type': 'Logistic Regression',
            'is_trained': self.is_trained,
            'features': self.feature_names,
            'feature_importance': self.feature_importance,
            'metrics': self.model_metrics
        }
        return info
    
    def save_model(self, model_path):
        """Save the trained model"""
        if not self.is_trained:
            raise ValueError("Cannot save untrained model")
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'feature_importance': self.feature_importance,
            'metrics': self.model_metrics,
            'is_trained': self.is_trained
        }
        
        joblib.dump(model_data, model_path)
        print(f"💾 Model saved to {model_path}")
    
    def load_model(self, model_path):
        """Load a trained model"""
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        
        model_data = joblib.load(model_path)
        
        self.model = model_data['model']
        self.scaler = model_data['scaler']
        self.feature_names = model_data['feature_names']
        self.feature_importance = model_data['feature_importance']
        self.model_metrics = model_data['metrics']
        self.is_trained = model_data['is_trained']
        
        print(f"📂 Model loaded from {model_path}")
        print(f"📊 Model accuracy: {self.model_metrics.get('test_accuracy', 'N/A')}")
    
    def retrain_with_feedback(self, feedback_data):
        """Retrain model with user feedback data"""
        # This would be implemented to incorporate user feedback
        # For now, just a placeholder
        print("🔄 Retraining with feedback data...")
        # Implementation would merge feedback with original training data
        # and retrain the model
        pass

if __name__ == "__main__":
    # Test the model
    model = BunkPredictionModel()
    
    # Train the model
    training_data_path = '/home/satyendra9580/Desktop/should/ml-service/data/training_data.json'
    model.train(training_data_path)
    
    # Save the model
    model_path = '/home/satyendra9580/Desktop/should/ml-service/models/trained_model.pkl'
    model.save_model(model_path)
    
    # Test prediction with your example
    test_features = {
        'attendance_pct': 89,
        'days_until_exam': 3,
        'syllabus_completion': 100,
        'past_performance': 85,
        'attendance_normalized': 0.89,
        'exam_urgency': 1/4,  # 1/(3+1)
        'syllabus_normalized': 1.0,
        'performance_normalized': 0.85,
        'attendance_syllabus_interaction': 0.89,
        'exam_preparation_score': 1.0 * 3 / 30
    }
    
    result = model.predict(test_features)
    print(f"\n🎯 Test Prediction for your example:")
    print(f"Recommendation: {result['prediction']}")
    print(f"Probability Safe: {result['probability_safe']:.1%}")
    print(f"Confidence: {result['confidence']:.1%}")
    print(f"Explanation: {result['explanation']}")
