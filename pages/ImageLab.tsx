
import React, { useState, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Sparkles, 
  ImageIcon, 
  Settings, 
  Download, 
  Share2, 
  Loader2, 
  AlertCircle, 
  ChevronDown, 
  Maximize2,
  ExternalLink,
  ShieldCheck,
  Zap,
  CheckCircle
} from 'lucide-react';

const ASPECT_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"];
const IMAGE_SIZES = ["1K", "2K", "4K"];

const ImageLab: React.FC = () => {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview'>('gemini-2.5-flash-image');
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [imageSize, setImageSize] = useState("1K");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      if (model === 'gemini-3-pro-image-preview') {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          // @ts-ignore
          await window.aistudio.openSelectKey();
        }
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const config: any = {
        imageConfig: {
          aspectRatio,
          ...(model === 'gemini-3-pro-image-preview' ? { imageSize } : {})
        }
      };

      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: prompt }] }],
        config
      });

      let foundImage = false;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
            foundImage = true;
            break;
          }
        }
      }

      if (!foundImage) {
        throw new Error("The model did not return an image. Try a more descriptive prompt.");
      }
    } catch (err: any) {
      console.error("Image generation failed:", err);
      let errMsg = "Something went wrong. Please try again.";
      if (err.message?.includes("Requested entity was not found")) {
        errMsg = "Selected model is currently unavailable with the current API key. Try switching to the standard model.";
      }
      setError(errMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = useCallback(() => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `kph-ai-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [generatedImage]);

  return (
    <div className="max-w-6xl mx-auto pb-12 animate-in fade-in duration-700">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-malawi-black p-2 rounded-xl text-white shadow-lg">
            <Sparkles size={24} />
          </div>
          <h1 className="text-3xl font-black text-malawi-black uppercase tracking-tight">AI Visualizer</h1>
        </div>
        <p className="text-gray-500 max-w-2xl font-medium">
          Create premium marketing visuals for your KENNETHPOETRYHEALTH network using next-gen Gemini AI.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <form onSubmit={handleGenerate} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Describe Visual</label>
              <textarea 
                rows={4}
                required
                className="w-full p-5 bg-gray-50 border border-gray-200 rounded-3xl focus:ring-2 focus:ring-malawi-green outline-none font-medium resize-none text-sm leading-relaxed"
                placeholder="e.g. 'A futuristic portrait of a Malawian entrepreneur holding a golden crown, digital art style'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quality Level</label>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  type="button"
                  onClick={() => setModel('gemini-2.5-flash-image')}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                    model === 'gemini-2.5-flash-image' ? 'border-malawi-black bg-gray-50' : 'border-transparent bg-gray-50/50 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Zap size={18} className="text-malawi-green" />
                    <span className="text-xs font-black uppercase">Standard (Fast)</span>
                  </div>
                  {model === 'gemini-2.5-flash-image' && <CheckCircle size={16} className="text-malawi-green" />}
                </button>
                <button 
                  type="button"
                  onClick={() => setModel('gemini-3-pro-image-preview')}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                    model === 'gemini-3-pro-image-preview' ? 'border-malawi-red bg-red-50/30' : 'border-transparent bg-gray-50/50 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Sparkles size={18} className="text-malawi-red" />
                    <span className="text-xs font-black uppercase">Ultra (Pro)</span>
                  </div>
                  {model === 'gemini-3-pro-image-preview' && <CheckCircle size={16} className="text-malawi-red" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Aspect</label>
                <select 
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-bold text-xs"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                >
                  {ASPECT_RATIOS.map(ratio => <option key={ratio} value={ratio}>{ratio}</option>)}
                </select>
              </div>
              
              {model === 'gemini-3-pro-image-preview' && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Size</label>
                  <select 
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none font-bold text-xs"
                    value={imageSize}
                    onChange={(e) => setImageSize(e.target.value)}
                  >
                    {IMAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                  </select>
                </div>
              )}
            </div>

            <button 
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-5 bg-malawi-black text-white rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl hover:bg-gray-800 disabled:opacity-50 transition-all active:scale-95"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
              {isGenerating ? 'Generating...' : 'Paint Visual'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-xs text-gray-400 uppercase tracking-widest">Canvas</h3>
              <div className="flex gap-2">
                <button disabled={!generatedImage} onClick={handleDownload} className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-30">
                  <Download size={18} />
                </button>
              </div>
            </div>

            <div className="flex-grow flex items-center justify-center p-8 bg-gray-50/50 min-h-[500px] relative">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-4 animate-pulse">
                  <div className="w-16 h-16 bg-malawi-green/20 rounded-full flex items-center justify-center text-malawi-green">
                    <Sparkles size={32} />
                  </div>
                  <p className="font-black text-malawi-black uppercase tracking-widest text-xs">AI is painting...</p>
                </div>
              ) : generatedImage ? (
                <img 
                  src={generatedImage} 
                  alt="Generated" 
                  className="max-w-full max-h-[600px] rounded-2xl shadow-2xl border-4 border-white animate-in zoom-in duration-500"
                />
              ) : error ? (
                <div className="text-center space-y-4">
                  <AlertCircle className="text-malawi-red mx-auto" size={40} />
                  <p className="text-sm font-bold text-gray-700">{error}</p>
                </div>
              ) : (
                <div className="text-center space-y-4 opacity-30">
                  <ImageIcon size={60} className="mx-auto text-gray-300" />
                  <p className="font-black uppercase tracking-widest text-[10px]">Your visual will appear here</p>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-malawi-black text-white/50 text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4">
              <span className="flex items-center gap-1.5"><ShieldCheck size={10} className="text-malawi-green" /> Secure</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={10} className="text-malawi-green" /> 4K Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageLab;
