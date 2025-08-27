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
- **Deployment**: Vercel (Frontend) + Render (Backend/ML)

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
- Logistic regression model
- Predictions based on:
  - Attendance percentage
  - Exam proximity
  - Syllabus completion
  - Past performance
- Model explainability with SHAP/LIME

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

## 🎨 UI Components

Built with shadcn/ui and Tailwind CSS:
- Modern, responsive design
- Dark/light theme support
- Mobile-friendly interface

## 🙏 Acknowledgments

- Built with modern web technologies
- ML model inspired by academic research
- UI components from shadcn/ui

---

**Happy Learning! 🎓**
