import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
import joblib
import os

def generate_synthetic_data(n_samples=1000):
    """
    Generate synthetic training data for the bunk prediction model
    Features: attendance_percentage, exam_proximity, syllabus_completion, past_performance
    Target: should_bunk (0: No, 1: Yes)
    """
    np.random.seed(42)
    
    # Generate features
    attendance_percentage = np.random.normal(75, 15, n_samples)
    attendance_percentage = np.clip(attendance_percentage, 0, 100)
    
    exam_proximity = np.random.exponential(0.3, n_samples)  # Higher values = closer exam
    exam_proximity = np.clip(exam_proximity, 0, 1)
    
    syllabus_completion = np.random.beta(2, 2, n_samples) * 100
    
    past_performance = np.random.normal(70, 20, n_samples)
    past_performance = np.clip(past_performance, 0, 100)
    
    # Create target variable based on logical rules
    should_bunk = np.zeros(n_samples)
    
    for i in range(n_samples):
        score = 0
        
        # Attendance factor (higher attendance = more likely to bunk safely)
        if attendance_percentage[i] >= 85:
            score += 0.4
        elif attendance_percentage[i] >= 75:
            score += 0.2
        elif attendance_percentage[i] < 65:
            score -= 0.3
        
        # Exam proximity factor (closer exam = less likely to bunk)
        if exam_proximity[i] < 0.1:  # Far from exam
            score += 0.3
        elif exam_proximity[i] < 0.3:  # Moderate distance
            score += 0.1
        elif exam_proximity[i] > 0.7:  # Very close to exam
            score -= 0.4
        
        # Syllabus completion factor
        if syllabus_completion[i] >= 80:
            score += 0.2
        elif syllabus_completion[i] >= 60:
            score += 0.1
        elif syllabus_completion[i] < 40:
            score -= 0.2
        
        # Past performance factor
        if past_performance[i] >= 85:
            score += 0.1
        elif past_performance[i] < 60:
            score -= 0.1
        
        # Add some randomness
        score += np.random.normal(0, 0.1)
        
        # Convert score to binary decision
        should_bunk[i] = 1 if score > 0.2 else 0
    
    # Create DataFrame
    data = pd.DataFrame({
        'attendance_percentage': attendance_percentage,
        'exam_proximity': exam_proximity,
        'syllabus_completion': syllabus_completion,
        'past_performance': past_performance,
        'should_bunk': should_bunk
    })
    
    return data

def train_model():
    """Train the logistic regression model for bunk prediction"""
    
    print("Generating synthetic training data...")
    data = generate_synthetic_data(2000)
    
    # Prepare features and target
    feature_columns = ['attendance_percentage', 'exam_proximity', 'syllabus_completion', 'past_performance']
    X = data[feature_columns]
    y = data['should_bunk']
    
    print(f"Dataset shape: {X.shape}")
    print(f"Target distribution: {y.value_counts().to_dict()}")
    
    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Scale the features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train logistic regression model with hyperparameter tuning
    print("Training logistic regression model...")
    
    param_grid = {
        'C': [0.1, 1, 10, 100],
        'penalty': ['l1', 'l2'],
        'solver': ['liblinear', 'saga']
    }
    
    lr = LogisticRegression(random_state=42, max_iter=1000)
    grid_search = GridSearchCV(lr, param_grid, cv=5, scoring='roc_auc', n_jobs=-1)
    grid_search.fit(X_train_scaled, y_train)
    
    best_model = grid_search.best_estimator_
    print(f"Best parameters: {grid_search.best_params_}")
    print(f"Best cross-validation score: {grid_search.best_score_:.4f}")
    
    # Evaluate the model
    y_pred = best_model.predict(X_test_scaled)
    y_pred_proba = best_model.predict_proba(X_test_scaled)[:, 1]
    
    print("\nModel Performance:")
    print(f"ROC AUC Score: {roc_auc_score(y_test, y_pred_proba):.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': feature_columns,
        'importance': abs(best_model.coef_[0])
    }).sort_values('importance', ascending=False)
    
    print("\nFeature Importance:")
    print(feature_importance)
    
    # Create models directory if it doesn't exist
    os.makedirs('models', exist_ok=True)
    
    # Save the model and scaler
    joblib.dump(best_model, 'models/bunk_predictor.joblib')
    joblib.dump(scaler, 'models/scaler.joblib')
    
    # Save feature names for later use
    joblib.dump(feature_columns, 'models/feature_names.joblib')
    
    print("\nModel and scaler saved successfully!")
    
    return best_model, scaler, feature_columns

if __name__ == "__main__":
    model, scaler, features = train_model()
