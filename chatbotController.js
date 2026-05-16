import { GoogleGenAI } from "@google/genai";

// Initialize the SDK (it automatically picks up process.env.GEMINI_API_KEY)
const ai = new GoogleGenAI({ apiKey: "AIzaSyC5gzSgdEZnmANn_ZkUlJydNicL9MKTWto" });

export const handleChat = async (req, res) => {
    const { message, history } = req.body;

    try {
        // Map your frontend chat state to the structure the Gemini SDK expects
        const contents = [
            ...history.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            })),
            { role: 'user', parts: [{ text: message }] }
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                // This system instruction keeps FindBuddy context in its memory forever
                systemInstruction: `
                    You are "BuddyAI", the official AI companion on FindBuddy—a social fitness platform that connects workout partners based on routines, gym schedules, and locations (like Meerut, Noida, Delhi NCR).
                    
                    Your Core Persona:
                    - You are a knowledgeable, motivating gym peer and technical fitness coach.
                    - Keep your responses short, scannable, and minimalist. Use bullet points for routines.
                    - You know about full-stack web development, MERN stack, strength training, gym splits, yoga, and conditioning.
                    - Never break character. Never state you are an LLM made by Google. You are FindBuddy's resident AI.
                `
            }
        });

        res.status(200).json({ reply: response.text });
    } catch (error) {
        console.error("Chatbot Controller Error:", error);
        res.status(500).json({ error: "Failed to generate AI response" });
    }
};