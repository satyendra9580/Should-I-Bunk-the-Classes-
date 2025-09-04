import numpy as np
import pandas as pd
import json
from datetime import datetime, timedelta
import random

def generate_synthetic_training_data(n_samples=1000):
    """
    Generate synthetic training data for bunk prediction model
    Features: [attendance_pct, days_until_exam, syllabus_completion, past_performance]
    Target: 1 = Safe to bunk, 0 = Not safe to bunk
    """
    
    np.random.seed(42)  # For reproducibility
    random.seed(42)
    
    data = []
    
    for i in range(n_samples):
        # Generate realistic feature combinations
        attendance_pct = np.random.normal(80, 15)  # Mean 80%, std 15%
        attendance_pct = np.clip(attendance_pct, 30, 100)  # Clip to realistic range
        
        days_until_exam = np.random.exponential(10)  # Exponential distribution, most exams are closer
        days_until_exam = np.clip(days_until_exam, 1, 60)  # 1-60 days range
        
        syllabus_completion = np.random.beta(2, 1.5) * 100  # Beta distribution, skewed towards higher completion
        syllabus_completion = np.clip(syllabus_completion, 10, 100)
        
        past_performance = np.random.normal(75, 12)  # Normal distribution around 75%
        past_performance = np.clip(past_performance, 40, 95)
        
        # Generate realistic outcome based on logical rules with some noise
        # Base probability calculation
        prob_safe = 0.1  # Base probability
        
        # Attendance factor (higher attendance = safer)
        if attendance_pct >= 90:
            prob_safe += 0.4
        elif attendance_pct >= 80:
            prob_safe += 0.25
        elif attendance_pct >= 75:
            prob_safe += 0.1
        else:
            prob_safe -= 0.2
        
        # Exam proximity factor (closer exam = less safe)
        if days_until_exam <= 2:
            prob_safe -= 0.5
        elif days_until_exam <= 5:
            prob_safe -= 0.3
        elif days_until_exam <= 10:
            prob_safe -= 0.1
        else:
            prob_safe += 0.2
        
        # Syllabus completion factor
        if syllabus_completion >= 90:
            prob_safe += 0.3
        elif syllabus_completion >= 70:
            prob_safe += 0.15
        elif syllabus_completion >= 50:
            prob_safe += 0.05
        else:
            prob_safe -= 0.15
        
        # Past performance factor
        if past_performance >= 85:
            prob_safe += 0.2
        elif past_performance >= 75:
            prob_safe += 0.1
        elif past_performance >= 65:
            prob_safe += 0.05
        else:
            prob_safe -= 0.1
        
        # Interaction effects
        # High attendance + distant exam = very safe
        if attendance_pct >= 85 and days_until_exam > 15:
            prob_safe += 0.2
        
        # Low attendance + close exam = very unsafe
        if attendance_pct < 75 and days_until_exam <= 5:
            prob_safe -= 0.3
        
        # High syllabus completion can compensate for closer exams
        if syllabus_completion >= 90 and days_until_exam <= 7:
            prob_safe += 0.15
        
        # Clip probability to valid range
        prob_safe = np.clip(prob_safe, 0.05, 0.95)
        
        # Add some random noise to make it more realistic
        prob_safe += np.random.normal(0, 0.1)
        prob_safe = np.clip(prob_safe, 0.05, 0.95)
        
        # Generate binary outcome based on probability
        outcome = 1 if np.random.random() < prob_safe else 0
        
        # Create additional derived features
        attendance_normalized = attendance_pct / 100
        exam_urgency = 1 / (days_until_exam + 1)  # Higher for closer exams
        syllabus_normalized = syllabus_completion / 100
        performance_normalized = past_performance / 100
        
        # Interaction features
        attendance_syllabus_interaction = attendance_normalized * syllabus_normalized
        exam_preparation_score = syllabus_normalized * days_until_exam / 30  # Preparation time score
        
        data.append({
            'attendance_pct': round(attendance_pct, 2),
            'days_until_exam': round(days_until_exam, 1),
            'syllabus_completion': round(syllabus_completion, 2),
            'past_performance': round(past_performance, 2),
            'attendance_normalized': round(attendance_normalized, 4),
            'exam_urgency': round(exam_urgency, 4),
            'syllabus_normalized': round(syllabus_normalized, 4),
            'performance_normalized': round(performance_normalized, 4),
            'attendance_syllabus_interaction': round(attendance_syllabus_interaction, 4),
            'exam_preparation_score': round(exam_preparation_score, 4),
            'outcome': outcome,
            'probability_safe': round(prob_safe, 4)  # For analysis purposes
        })
    
    return data

def create_feature_descriptions():
    """Create descriptions for all features"""
    return {
        'features': {
            'attendance_pct': 'Attendance percentage (30-100%)',
            'days_until_exam': 'Days until next exam (1-60 days)',
            'syllabus_completion': 'Syllabus completion percentage (10-100%)',
            'past_performance': 'Past academic performance score (40-95%)',
            'attendance_normalized': 'Normalized attendance (0-1)',
            'exam_urgency': 'Exam urgency score (1/(days+1))',
            'syllabus_normalized': 'Normalized syllabus completion (0-1)',
            'performance_normalized': 'Normalized past performance (0-1)',
            'attendance_syllabus_interaction': 'Interaction between attendance and syllabus',
            'exam_preparation_score': 'Preparation adequacy score'
        },
        'target': {
            'outcome': 'Binary outcome: 1 = Safe to bunk, 0 = Not safe to bunk'
        },
        'generation_logic': {
            'attendance_factor': 'Higher attendance increases safety probability',
            'exam_proximity_factor': 'Closer exams decrease safety probability',
            'syllabus_factor': 'Higher completion increases safety probability',
            'performance_factor': 'Better past performance increases safety probability',
            'interaction_effects': 'Combined effects of multiple factors',
            'noise': 'Random noise added for realism'
        }
    }

if __name__ == "__main__":
    print("🔄 Generating synthetic training data...")
    
    # Generate training data
    training_data = generate_synthetic_training_data(1000)
    
    # Create DataFrame for analysis
    df = pd.DataFrame(training_data)
    
    # Basic statistics
    print(f"✅ Generated {len(training_data)} training samples")
    print(f"📊 Outcome distribution: {df['outcome'].value_counts().to_dict()}")
    print(f"📈 Average attendance: {df['attendance_pct'].mean():.1f}%")
    print(f"📅 Average days until exam: {df['days_until_exam'].mean():.1f}")
    print(f"📚 Average syllabus completion: {df['syllabus_completion'].mean():.1f}%")
    
    # Save training data
    with open('/home/satyendra9580/Desktop/should/ml-service/data/training_data.json', 'w') as f:
        json.dump(training_data, f, indent=2)
    
    # Save feature descriptions
    descriptions = create_feature_descriptions()
    with open('/home/satyendra9580/Desktop/should/ml-service/data/feature_descriptions.json', 'w') as f:
        json.dump(descriptions, f, indent=2)
    
    # Save as CSV for easy analysis
    df.to_csv('/home/satyendra9580/Desktop/should/ml-service/data/training_data.csv', index=False)
    
    print("💾 Training data saved to:")
    print("  - training_data.json")
    print("  - training_data.csv") 
    print("  - feature_descriptions.json")
    print("\n🎯 Sample data points:")
    print(df.head().to_string())
