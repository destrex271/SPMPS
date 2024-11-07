// Make sure to include these imports:
// import { GoogleAIFileManager } from "@google/generative-ai/server";
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import fs from 'fs'
// import { join } from "path";
//
// console.log("key -> ", process.env.API_KEY)
//
// // const fileManager = new GoogleAIFileManager(process.env.API_KEY);
//
// export async function PromptGemini(filePath){
//     console.log(filePath)
//     const uploadResult = await fileManager.uploadFile(
//         filePath,
//         {
//           mimeType: "image/jpeg",
//           displayName: "Jetpack drawing",
//         },
//       );
//       // View the response.
//       console.log(
//         `Uploaded file ${uploadResult.file.displayName} as: ${uploadResult.file.uri}`,
//       );
//      
//       const genAI = new GoogleGenerativeAI(process.env.API_KEY);
//       const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
//       const result = await model.generateContent([
//         "Return the License Numbers of vehicles in the image and give me the response as [License Plate 1, License Plate 2 ....].",
//         {
//           fileData: {
//             fileUri: uploadResult.file.uri,
//             mimeType: uploadResult.file.mimeType,
//           },
//         },
//       ]);
//       console.log(result.response.text());
// }
//
/*
 * Install the Generative AI SDK
 *
 * $ npm install @google/generative-ai
 */
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold,} from "@google/generative-ai";
import {GoogleAIFileManager} from "@google/generative-ai/server";
  
const apiKey = process.env.API_KEY
const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);
  
  /**
   * Uploads the given file to Gemini.
   *
   * See https://ai.google.dev/gemini-api/docs/prompting_with_media
   */
async function uploadToGemini(path, mimeType) {
    const uploadResult = await fileManager.uploadFile(path, {
      mimeType,
      displayName: path,
    });
    const file = uploadResult.file;
    console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
    return file;
}
  
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
});

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
};
  
export async function PromptGemini(filePath) {
    const files = [
      await uploadToGemini(filePath, "image/jpeg"),
    ];

    const chatSession = model.startChat({
      generationConfig,
      history: [
        {
          role: "user",
          parts: [
            {
              fileData: {
                mimeType: files[0].mimeType,
                fileUri: files[0].uri,
              },
            },
            {text: "Return the License Numbers of vehicles in the image and give me the response as [License Plate 1, License Plate 2 ....]. In license plate numbers remove any whitespaces in between.\n NOTE: If there are no cars then return empty list like []\n"},
          ],
        },
      ],
    });

    const result = await chatSession.sendMessage("INSERT_INPUT_HERE");
    return JSON.parse(result.response.text());
}
