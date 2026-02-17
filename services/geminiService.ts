
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Task, InfographicData } from "../types";

export const getSmartPlanningAdvice = async (tasks: Task[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const taskList = tasks.map(t => `${t.title} الساعة ${t.time} (أولوية ${t.priority === 'high' ? 'عالية' : t.priority === 'medium' ? 'متوسطة' : 'منخفضة'})`).join(", ");
    const prompt = `لدي المهام التالية المخطط لها: ${taskList}. 
    قدم ملخصاً موجزاً ومحفزاً ونصيحة واحدة لزيادة الإنتاجية باللغة العربية. 
    اجعل الأسلوب ودوداً وحيوياً، مناسباً لتطبيق اسمه "يلا تاسك" (Yalla Task).
    يجب أن يكون الرد باللغة العربية فقط.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "خطة رائعة! يلا نبدأ وننجز مهامنا بذكاء!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "استمر في التركيز وحقق أهدافك!";
  }
};

export const summarizeAndTts = async (fileBase64: string, mimeType: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Step 1: Summarize
  const summaryResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: { data: fileBase64, mimeType }
        },
        { text: "لخص هذا المستند بشكل موجز جداً ومفيد باللغة العربية." }
      ]
    }
  });
  
  const summaryText = summaryResponse.text || "لم نتمكن من تلخيص المستند.";

  // Step 2: Convert to TTS
  const ttsResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `اقرأ هذا الملخص بصوت واضح: ${summaryText}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return { summary: summaryText, audioData: base64Audio };
};

export const generateInfographic = async (fileBase64: string, mimeType: string): Promise<InfographicData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: fileBase64, mimeType } },
        { text: "حول هذا الشرح إلى إنفوجرافيك جذاب. أخرج البيانات في شكل JSON يحتوي على عنوان رئيسي، ملخص، وقائمة من الخطوات (كل خطوة لها عنوان، محتوى، وأيقونة FontAwesome مناسبة)." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mainTitle: { type: Type.STRING },
          summary: { type: Type.STRING },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                icon: { type: Type.STRING, description: "FontAwesome class like 'fa-rocket'" }
              },
              required: ["title", "content", "icon"]
            }
          }
        },
        required: ["mainTitle", "summary", "steps"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};
