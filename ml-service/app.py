from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import logging
import pandas as pd
from utils.predictor import BunkPredictor

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the predictor
predictor = None

def initialize_predictor():
    """Initialize the ML predictor"""
    global predictor
    try:
        predictor = BunkPredictor()
        logger.info("ML Predictor initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize predictor: {str(e)}")
        return False

def startup():
    """Initialize services on startup"""
    logger.info("Starting ML Service...")
    
    # Train model if it doesn't exist
    model_path = os.getenv('MODEL_PATH', 'models/bunk_predictor.joblib')
    if not os.path.exists(model_path):
        logger.info("Model not found. Training new model...")
        try:
            from models.train_model import train_model
            train_model()
            logger.info("Model training completed")
        except Exception as e:
            logger.error(f"Model training failed: {str(e)}")
    
    # Initialize predictor
    initialize_predictor()

# Root endpoint
@app.route('/', methods=['GET'])
def root():
    """Root endpoint with service information"""
    return jsonify({
        'service': 'Should I Bunk ML Service',
        'version': '1.0.0',
        'status': 'running',
        'endpoints': {
            '/health': 'Health check',
            '/predict': 'Get bunk prediction',
            '/batch-predict': 'Get batch predictions',
            '/model-info': 'Get model information'
        }
    })

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'ML Prediction Service',
        'model_loaded': predictor is not None,
        'timestamp': str(pd.Timestamp.now())
    }), 200

@app.route('/predict', methods=['POST'])
def predict():
    """
    Main prediction endpoint
    Expected input:
    {
        "attendance_percentage": float (0-100),
        "exam_proximity": float (0-1),
        "syllabus_completion": float (0-100),
        "past_performance": float (0-100),
        "subject": string (optional),
        "user_id": string (optional)
    }
    """
    try:
        # Get request data
        data = request.get_json()
        
        if not data:
            return jsonify({
                'error': 'No data provided',
                'message': 'Request body must contain JSON data'
            }), 400
        
        # Validate required fields
        required_fields = ['attendance_percentage', 'exam_proximity', 'syllabus_completion', 'past_performance']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({
                'error': 'Missing required fields',
                'missing_fields': missing_fields,
                'required_fields': required_fields
            }), 400
        
        # Extract and validate input values
        try:
            attendance_percentage = float(data['attendance_percentage'])
            exam_proximity = float(data['exam_proximity'])
            syllabus_completion = float(data['syllabus_completion'])
            past_performance = float(data['past_performance'])
            
            # Validate ranges
            if not (0 <= attendance_percentage <= 100):
                raise ValueError("attendance_percentage must be between 0 and 100")
            if not (0 <= exam_proximity <= 1):
                raise ValueError("exam_proximity must be between 0 and 1")
            if not (0 <= syllabus_completion <= 100):
                raise ValueError("syllabus_completion must be between 0 and 100")
            if not (0 <= past_performance <= 100):
                raise ValueError("past_performance must be between 0 and 100")
                
        except (ValueError, TypeError) as e:
            return jsonify({
                'error': 'Invalid input values',
                'message': str(e)
            }), 400
        
        # Get optional fields
        subject = data.get('subject', 'Unknown')
        user_id = data.get('user_id', 'anonymous')
        
        # Make prediction
        if predictor is None:
            logger.warning("Predictor not initialized, attempting to reinitialize...")
            if not initialize_predictor():
                return jsonify({
                    'error': 'ML service unavailable',
                    'message': 'Prediction model could not be loaded'
                }), 503
        
        # Handle exam proximity logic
        # exam_proximity of 1.0 with "No upcoming exams" message means no exams exist
        # Check if this is a "no upcoming exams" case
        has_upcoming_exams = exam_proximity < 1.0 or exam_proximity != 1.0
        
        # For logging purposes, check the actual exam proximity value
        print(f"🤖 ML Input Data Prepared:")
        print(f"- Attendance %: {attendance_percentage}")
        print(f"- Exam proximity score: {exam_proximity:.3f}")
        
        # If exam_proximity is exactly 1.0, it usually means "no upcoming exams"
        # But we need to be more specific about this detection
        if exam_proximity == 1.0:
            has_upcoming_exams = False
            days_until_exam = 0  # No exams
            print(f"- Days until exam: No upcoming exams")
        else:
            has_upcoming_exams = True
            # Convert exam_proximity (0-1 score) to days_until_exam for predictor
            # exam_proximity of 0.1 means exam is very close (1-2 days)
            # exam_proximity of 0.9 means exam is far (27+ days)
            days_until_exam = max(1, int(exam_proximity * 30))
            print(f"- Days until exam: {days_until_exam}")
        
        print(f"- Syllabus completion %: {syllabus_completion}")
        print(f"- Past performance %: {past_performance}")
        print(f"- User ID: {user_id}")
        
        # Get prediction with correct format
        features = [attendance_percentage, days_until_exam, syllabus_completion, past_performance]
        result = predictor.predict(features, has_upcoming_exams)
        
        # Add metadata
        result['metadata'] = {
            'subject': subject,
            'user_id': user_id,
            'model_version': '1.0',
            'timestamp': str(pd.Timestamp.now())
        }
        
        # Log prediction (for monitoring)
        logger.info(f"Prediction made for user {user_id}, subject {subject}: {result['prediction']}")
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'An error occurred while making the prediction'
        }), 500

@app.route('/batch-predict', methods=['POST'])
def batch_predict():
    """
    Batch prediction endpoint for multiple inputs
    Expected input:
    {
        "predictions": [
            {
                "attendance_percentage": float,
                "exam_proximity": float,
                "syllabus_completion": float,
                "past_performance": float,
                "subject": string (optional),
                "user_id": string (optional)
            },
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'predictions' not in data:
            return jsonify({
                'error': 'Invalid request format',
                'message': 'Request must contain "predictions" array'
            }), 400
        
        predictions_input = data['predictions']
        
        if not isinstance(predictions_input, list) or len(predictions_input) == 0:
            return jsonify({
                'error': 'Invalid predictions format',
                'message': 'Predictions must be a non-empty array'
            }), 400
        
        if len(predictions_input) > 100:  # Limit batch size
            return jsonify({
                'error': 'Batch size too large',
                'message': 'Maximum 100 predictions per batch'
            }), 400
        
        results = []
        errors = []
        
        for i, pred_data in enumerate(predictions_input):
            try:
                # Validate required fields
                required_fields = ['attendance_percentage', 'exam_proximity', 'syllabus_completion', 'past_performance']
                missing_fields = [field for field in required_fields if field not in pred_data]
                
                if missing_fields:
                    errors.append({
                        'index': i,
                        'error': f'Missing fields: {missing_fields}'
                    })
                    continue
                
                # Extract values
                attendance_percentage = float(pred_data['attendance_percentage'])
                exam_proximity = float(pred_data['exam_proximity'])
                syllabus_completion = float(pred_data['syllabus_completion'])
                past_performance = float(pred_data['past_performance'])
                
                # Make prediction
                result = predictor.predict(
                    attendance_percentage=attendance_percentage,
                    exam_proximity=exam_proximity,
                    syllabus_completion=syllabus_completion,
                    past_performance=past_performance
                )
                
                # Add metadata
                result['metadata'] = {
                    'index': i,
                    'subject': pred_data.get('subject', 'Unknown'),
                    'user_id': pred_data.get('user_id', 'anonymous')
                }
                
                results.append(result)
                
            except Exception as e:
                errors.append({
                    'index': i,
                    'error': str(e)
                })
        
        return jsonify({
            'results': results,
            'errors': errors,
            'total_processed': len(results),
            'total_errors': len(errors)
        }), 200
        
    except Exception as e:
        logger.error(f"Batch prediction error: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'An error occurred during batch prediction'
        }), 500

@app.route('/model-info', methods=['GET'])
def model_info():
    """Get information about the loaded model"""
    try:
        if predictor is None:
            return jsonify({
                'error': 'Model not loaded',
                'message': 'ML predictor is not initialized'
            }), 503
        
        # Get feature importance
        feature_importance = predictor.get_feature_importance()
        
        info = {
            'model_type': 'Logistic Regression',
            'version': '1.0',
            'features': predictor.feature_names,
            'feature_importance': feature_importance,
            'description': 'Binary classifier for predicting whether it is safe to bunk a class',
            'input_ranges': {
                'attendance_percentage': '0-100',
                'exam_proximity': '0-1 (0=far, 1=very close)',
                'syllabus_completion': '0-100',
                'past_performance': '0-100'
            },
            'output_classes': ['Not Safe', 'Safe to Bunk']
        }
        
        return jsonify(info), 200
        
    except Exception as e:
        logger.error(f"Model info error: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'Could not retrieve model information'
        }), 500

@app.route('/retrain', methods=['POST'])
def retrain_model():
    """Retrain the model (for future use with real data)"""
    try:
        # This is a placeholder for future implementation
        # In production, you would retrain with new data
        
        return jsonify({
            'message': 'Model retraining not implemented yet',
            'note': 'This endpoint will be used to retrain the model with new data'
        }), 501
        
    except Exception as e:
        logger.error(f"Retrain error: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'Model retraining failed'
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Endpoint not found',
        'message': 'The requested endpoint does not exist'
    }), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        'error': 'Method not allowed',
        'message': 'The HTTP method is not allowed for this endpoint'
    }), 405

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal server error',
        'message': 'An unexpected error occurred'
    }), 500

if __name__ == '__main__':
    # Initialize the predictor on startup
    startup()
    
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    logger.info(f"Starting ML Service on port {port}")
    logger.info(f"Debug mode: {debug}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
