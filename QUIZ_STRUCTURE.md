# Quiz Application Structure

## 📁 File Structure

```
src/
├── data/
│   └── quizzes/
│       ├── en.json     # English questions
│       ├── fr.json     # French questions  
│       └── ar.json     # Arabic questions
├── pages/
│   ├── quiz-selection.tsx  # Quiz selection page
│   ├── quiz-waiting.tsx    # Waiting room
│   ├── quiz-play.tsx       # Quiz playing interface
│   └── quiz-history.tsx    # Quiz history
└── services/
    └── quizService.ts      # Quiz data management
```

## 🎯 Quiz JSON Structure

Each language file (`en.json`, `fr.json`, `ar.json`) follows this structure:

```json
{
  "title": "Web Development Quiz",
  "description": "Test your knowledge of HTML, CSS, JavaScript, and modern web technologies",
  "questions": [
    {
      "id": 1,
      "question": "What does HTML stand for?",
      "options": [
        "HyperText Markup Language",
        "High Tech Modern Language", 
        "Home Tool Markup Language",
        "Hyperlink and Text Markup Language"
      ],
      "correctAnswer": 0
    }
  ]
}
```

## 🌍 Adding New Languages

1. **Create new language file** in `src/data/quizzes/`
   - Example: `es.json` for Spanish
   - Follow the same structure as existing files

2. **Update quizService.ts**:
   ```typescript
   // Add import
   import esQuizData from '../data/quizzes/es.json';
   
   // Add to getQuizData function
   case 'es':
     return esQuizData;
   ```

3. **Update quiz selection** in `quiz-selection.tsx`:
   ```typescript
   languages: ['en', 'fr', 'ar', 'es']  // Add new language
   ```

4. **Update language switcher** in `quiz-play.tsx`:
   ```typescript
   <Option value="es">🇪🇸 Español</Option>
   ```

## 📝 Adding New Quizzes

1. **Create quiz data files** for each language:
   ```
   src/data/quizzes/
   ├── javascript-basics/
   │   ├── en.json
   │   ├── fr.json
   │   └── ar.json
   ```

2. **Update quizService.ts** to load new quiz:
   ```typescript
   export const getQuizData = (language: string, quizId: string = 'web-development') => {
     switch (quizId) {
       case 'web-development':
         return getLanguageData(language);
       case 'javascript-basics':
         return getJavaScriptBasicsData(language);
       // Add more cases
     }
   };
   ```

3. **Add to quiz selection** in `quiz-selection.tsx`:
   ```typescript
   const availableQuizzes: Quiz[] = [
     // ... existing quizzes
     {
       id: 'javascript-basics',
       title: 'JavaScript Fundamentals',
       description: 'Core JavaScript concepts and ES6+ features',
       category: 'Programming',
       languages: ['en', 'fr', 'ar'],
       questionCount: 30,
       difficulty: 'Medium'
     }
   ];
   ```

## 🔧 Features

### ✅ Implemented Features:
- **Multi-language support** (EN, FR, AR)
- **Real-time quiz management** with admin dashboard
- **Live leaderboard** during active quizzes
- **Answer validation** with correct answer display
- **Point system** (1-30 points per question, unique per quiz)
- **Quiz history** tracking for each user
- **Language switching** during quiz
- **Quiz selection** interface

### 🎮 Quiz Flow:
1. **User selects quiz** → Quiz selection page
2. **User chooses language** → Language selection
3. **User joins waiting room** → Added to quiz players list
4. **Admin starts quiz** → All users redirected to quiz
5. **Users answer questions** → Real-time score updates
6. **Quiz completes** → Results and history saved

### 📊 Admin Features:
- **Create quizzes** in any language
- **Real-time leaderboard** during active quiz
- **Player progress tracking** (Q5/30)
- **Start/end quizzes** anytime
- **View active users**

### 🌐 Language Support:
- **English** (🇺🇸)
- **French** (🇫🇷) 
- **Arabic** (🇸🇦)
- **Extensible** for more languages

## 🚀 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Firebase**:
   - Update `src/config/firebase.ts` with your Firebase config
   - Enable Authentication (Google provider)
   - Enable Realtime Database

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Access admin**:
   - Go to `/admin/login`
   - Use the admin secret from `src/config/admin.ts`

## 📋 Quiz Management

### Creating a New Quiz:
1. Create JSON files for each language
2. Add quiz to `availableQuizzes` array
3. Update `quizService.ts` to load new quiz data
4. Test with admin dashboard

### Adding Questions:
1. Edit the appropriate language JSON file
2. Follow the question structure:
   - `id`: Unique question ID
   - `question`: Question text
   - `options`: Array of 4 answer options
   - `correctAnswer`: Index of correct option (0-3)

### Language Translation:
1. Copy English questions to new language file
2. Translate question text and options
3. Keep `id` and `correctAnswer` the same
4. Update quiz selection to include new language

## 🔒 Security Notes

- Admin access controlled by secret string
- User authentication via Google OAuth
- Real-time data validation
- Quiz history per user
- No quiz finishing - can start new quizzes anytime 