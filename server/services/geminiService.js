const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyChWOiEbH7REFo8I5aSZIgHMGfQf5RirU4');

/**
 * Generate enhanced AI recommendations based on ML prediction results
 * @param {Object} predictionData - ML prediction results and user data
 * @returns {Promise<Object>} Enhanced recommendations with explanations
 */
async function generateEnhancedRecommendations(predictionData) {
  try {
    const {
      recommendation,
      confidence,
      explanation,
      attendance_percentage,
      exam_proximity_days,
      syllabus_completion,
      average_marks,
      subject,
      class_type
    } = predictionData;

    const prompt = `
You are a friendly AI academic advisor. Create an engaging, visually appealing response that students will actually want to read!

Student Data:
- Attendance: ${attendance_percentage}%
- Days until exam: ${exam_proximity_days ? `${exam_proximity_days} days` : 'No upcoming exams'}  
- Syllabus covered: ${syllabus_completion}%${average_marks ? `\n- Average marks: ${average_marks}%` : ''}
- Subject: ${subject || 'General'}
- Class: ${class_type}

ML Recommendation: ${recommendation} (${confidence}% confidence)

Create a response that is:
✅ Easy to scan and read quickly
✅ Uses emojis and visual elements
✅ Has short, punchy sections
✅ Includes actionable advice
✅ Feels personal and encouraging

Format your response like this:

🎯 **Quick Assessment**
[2-3 short sentences about their situation]

📚 **Smart Action Plan**
[3-4 specific, actionable steps with emojis]

⚡ **Priority Focus**
[What they should focus on most]

🚨 **Reality Check**
[Honest consequences if they don't act]

💪 **Motivation Boost**
[Encouraging words to keep them going]

Use emojis, short sentences, and make it visually appealing. Avoid long paragraphs. Make each section scannable and actionable. Vary the content based on their specific numbers - don't make it generic!
`;

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Generate content using Gemini
    const result = await model.generateContent([
      "You are a helpful AI academic advisor who provides personalized, actionable advice to college students about attendance, studying, and academic success.",
      prompt
    ]);

    const response = await result.response;
    const aiRecommendation = response.text();

    return {
      success: true,
      aiRecommendation,
      originalPrediction: {
        recommendation,
        confidence,
        explanation
      },
      metadata: {
        model: "gemini-1.5-flash",
        timestamp: new Date().toISOString(),
        provider: "Google Gemini AI"
      }
    };

  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    // Fallback response if OpenAI fails
    return {
      success: false,
      error: error.message,
      fallbackRecommendation: `Based on your ${predictionData.attendance_percentage}% attendance and ${predictionData.syllabus_completion}% syllabus completion, here's my analysis:

**Current Situation**: ${predictionData.recommendation === 'attend' ? 'You should attend the next class' : 'You can consider bunking the next class'} (${predictionData.confidence}% confidence).

**Key Points**:
- Your attendance is ${predictionData.attendance_percentage >= 75 ? 'good' : 'needs improvement'}
- ${predictionData.exam_proximity_days <= 7 ? 'Exam is approaching soon - focus on preparation' : 'You have time before exams'}
- Syllabus completion at ${predictionData.syllabus_completion}% ${predictionData.syllabus_completion >= 70 ? 'is on track' : 'needs acceleration'}

**Recommendation**: ${predictionData.explanation}

Note: Enhanced AI recommendations are temporarily unavailable. This is a basic analysis based on your data.`
    };
  }
}

module.exports = {
  generateEnhancedRecommendations
};
