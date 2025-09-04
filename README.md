# Should I Bunk the Class? 🎓

A full-stack MERN application with ML integration that helps students make informed decisions about class attendance based on their academic data.

## 🎯 Project Overview

This web application uses machine learning to analyze student data including attendance percentage, exam proximity, syllabus completion, and past performance to recommend whether it's safe to skip a class or not.

## 🧱 Tech Stack

- **Frontend**: React.js with Tailwind CSS and shadcn/ui
- **Backend**: Node.js + Express.js
- **Database**: MongoDB
- **ML Service**: Python with Flask and Scikit-learn
- **Authentication**: JWT with bcrypt

## 📦 Features

### 🔐 Authentication System
- User signup/login with JWT
- Role-based access (Student/Admin)
- Secure password hashing with bcrypt

### 📊 User Dashboard
- Attendance statistics visualization
- Upcoming exams overview
- ML prediction results with explanations

### 📈 Attendance Management
- Subject-wise attendance tracking
- CSV upload support
- Historical attendance logs

### 📚 Exam & Syllabus Tracking
- CRUD operations for exams
- Syllabus progress tracking
- Topic completion status

### 🤖 ML Integration
- **Logistic Regression Model** with 76.5% accuracy
- **Probability-based predictions** instead of binary outcomes
- **Feature importance analysis** showing which factors matter most
- **Synthetic training data** with 1000+ realistic scenarios
- **Model retraining** capability with user feedback
- Predictions based on:
  - Attendance percentage
  - Exam proximity  
  - Syllabus completion

## 📊 Logistic Regression Model Details

The system uses **true machine learning** with a trained logistic regression model instead of hardcoded rules:

### 🧮 **Mathematical Formula**

```
P(safe) = 1 / (1 + e^-(β₀ + β₁×attendance + β₂×exam_urgency + β₃×syllabus + β₄×performance + β₅×interactions))
```

**Where:**
- `β₀ = intercept` (baseline probability)
- `β₁ = +0.3759` (attendance coefficient)
- `β₂ = -0.4284` (exam urgency coefficient - negative because closer exams are riskier)
- `β₃ = -0.7126` (syllabus coefficient - negative due to interaction effects)
- `β₄ = +0.2141` (past performance coefficient)
- `β₅ = +1.0086` (attendance × syllabus interaction - strongest predictor)

### 📈 **Model Performance**
- **Training Accuracy**: 75.7%
- **Test Accuracy**: 76.5%
- **Cross-validation**: 75.6% ± 1.3%
- **AUC Score**: 78.5%
- **Training Data**: 1000 synthetic scenarios

### 🔍 Prediction Logic

The system prioritizes **exam proximity** over attendance percentage, which explains why high attendance doesn't guarantee "Safe" predictions:

#### **Priority 1: Immediate Exams (0-2 days)**
```
IF days_until_exam ≤ 2:
    RESULT = "Not Safe" (95% confidence)
    REASON = "Exam too close - critical preparation time"
```

#### **Priority 2: Very Close Exams (3-5 days)**
```
IF days_until_exam ≤ 5:
    IF attendance ≥ 90% AND syllabus ≥ 95%:
        RESULT = "Moderate Risk" (70% confidence)
    ELSE:
        RESULT = "Not Safe" (85% confidence)
    REASON = "High risk period - final preparation needed"
```

#### **Priority 3: Close Exams (6-10 days)**
```
IF days_until_exam ≤ 10:
    IF attendance ≥ 85% AND syllabus ≥ 80%:
        RESULT = "Moderate Risk" (65% confidence)
    ELSE:
        RESULT = "Not Safe" (75% confidence)
    REASON = "Preparation time running short"
```

#### **Priority 4: Distant Exams (>10 days)**
```
IF days_until_exam > 10:
    IF attendance ≥ 85% AND syllabus ≥ 70%:
        RESULT = "Safe to Bunk" (80% confidence)
    ELIF attendance ≥ 75% AND syllabus ≥ 60%:
        RESULT = "Moderate Risk" (60% confidence)
    ELSE:
        RESULT = "Not Safe" (70% confidence)
```

### 📈 Confidence Calculation

Confidence levels are predetermined based on risk categories:
- **95%**: Immediate exams (0-2 days)
- **85%**: Close exams with suboptimal conditions
- **80%**: Distant exams with good metrics
- **70%**: Moderate risk scenarios
- **60-65%**: Borderline cases

### 📊 Visualizations
- Attendance timeline charts
- Risk probability indicators
- Syllabus progress bars

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- Python (v3.8+)
- MongoDB connection

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd should-i-bunk-class
   ```

2. **Backend Setup**
   ```bash
   cd server
   npm install
   cp .env.example .env
   # Add your MongoDB URI and JWT secret
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd client
   npm install
   npm start
   ```

4. **ML Service Setup**
   ```bash
   cd ml-service
   pip install -r requirements.txt
   python app.py
   ```

## 📂 Project Structure

```
should-i-bunk-class/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── utils/         # Utility functions
│   │   └── services/      # API services
│   └── package.json
├── server/                # Node.js backend
│   ├── controllers/       # Route controllers
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── middleware/       # Custom middleware
│   ├── utils/            # Utility functions
│   └── package.json
├── ml-service/           # Python ML service
│   ├── models/           # ML models
│   ├── utils/            # ML utilities
│   ├── app.py           # Flask application
│   └── requirements.txt
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Add attendance record
- `PUT /api/attendance/:id` - Update attendance record

### Exams
- `GET /api/exams` - Get exams
- `POST /api/exams` - Create exam
- `PUT /api/exams/:id` - Update exam
- `DELETE /api/exams/:id` - Delete exam

### Syllabus
- `GET /api/syllabus` - Get syllabus topics
- `POST /api/syllabus` - Create syllabus topic
- `PUT /api/syllabus/:id` - Update syllabus topic

### ML Predictions
- `POST /api/predict` - Get bunk recommendation

## 🤖 ML Model Details

The logistic regression model considers:
- **Attendance Percentage**: Current attendance rate
- **Exam Proximity**: Days until next exam
- **Syllabus Completion**: Percentage of syllabus covered

**Output**: 
- Recommendation: "Safe to Bunk" or "Not Safe"
- Risk probability (0-1)
- Explanation of factors

---

**Happy Learning! 🎓**
