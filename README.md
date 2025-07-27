# Quiz Play Page

This page is the main interface for playing a real-time quiz game built with React, TypeScript, and Firebase. It allows authenticated users to join a quiz session, answer questions, wager points, and see their results.

## Features

- **Real-time Quiz Play:** Join a quiz session and answer questions in real time.
- **Points Wagering:** For each question, select how many points to wager. Each point value can only be used once.
- **Timer:** Each question has a countdown timer.
- **Live Score Tracking:** See your current score and progress throughout the quiz.
- **Results:** View your results and compare with other players at the end of the quiz.
- **Authentication:** Only logged-in users can access the quiz play page.
- **Firebase Integration:** All quiz data and user progress are synced in real time using Firebase Realtime Database.

## How It Works

1. **Join a Quiz:** After logging in, users can join a quiz session from the waiting room.
2. **Answer Questions:** For each question, select an answer and choose how many points to wager.
3. **Submit Answer:** Submit your answer before the timer runs out.
4. **Next Question:** Proceed to the next question until the quiz is finished.
5. **View Results:** At the end, see your total score and how you ranked among other players.

## Technologies Used

- **React** (with Hooks)
- **TypeScript**
- **Ant Design** (UI components)
- **Firebase Realtime Database**
- **React Router**
- **React Toastify** (notifications)

## File Structure

- `src/pages/quiz-play.tsx` — Main component for the quiz play experience.
- `src/contexts/AuthContext.tsx` — Handles authentication state.
- `src/services/quizService.ts` — Fetches quiz questions and metadata.
- `src/config/firebase.ts` — Firebase configuration.

## Usage

1. **Start the App:**  
   Run `npm install` and `npm run dev` to start the development server.

2. **Login:**  
   Navigate to `/login` and sign in.

3. **Join a Quiz:**  
   Go to `/quiz/waiting` to join a quiz session.

4. **Play the Quiz:**  
   Once the quiz starts, answer questions and wager points.

5. **View Results:**  
   After the last question, see your results and ranking.

## Notes

- Each point value can only be used once per quiz.
- If you leave the page, your progress is saved and restored on return.
- Only authenticated users can access the quiz play page.

## Screenshots

![Quiz Play Screenshot](./screenshots/quiz-play.png)

## License

This project is for educational purposes.

---
