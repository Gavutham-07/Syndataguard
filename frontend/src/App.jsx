import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  Upload,
  Brain,
  Database,
  Download,
  Activity,
  Lock,
  Trash2,
  MessageSquare,
  Send,
  Bot,
  User,
  ShieldCheck,
  Lightbulb,
  FileText,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function App() {
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [aiData, setAiData] = useState(null); // Stores parsed AI JSON
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [backendStatus, setBackendStatus] = useState("Initializing..."); // NEW
  const [backendProgress, setBackendProgress] = useState(0); // NEW

  // Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hello! Upload a dataset and I will analyze it for privacy risks.",
    },
  ]);
  const [inputMsg, setInputMsg] = useState("");

  // Settings
  const [rowsToGenerate, setRowsToGenerate] = useState(1000);
  const [modelType, setModelType] = useState("hybrid");
  const [frozenCols, setFrozenCols] = useState({});
  const [removedCols, setRemovedCols] = useState({});
  const [results, setResults] = useState(null);

// --- REAL-TIME BACKEND POLLER ---
  useEffect(() => {
    let interval;
    if (loading && analysis?.filename && loadingText === "Initializing Synthetic Data Engine...") {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`http://localhost:8000/status/${analysis.filename}`);
          setBackendStatus(res.data.step);
          setBackendProgress(res.data.progress);
          
          // Optional: Add a smooth fake increment while stuck on the long "Training" step
          if (res.data.progress === 15) {
             setBackendProgress(prev => prev < 70 ? prev + 1 : prev);
          }
        } catch (error) {
          console.error("Status fetch error", error);
        }
      }, 1000); // Poll backend every 1 second
    } else {
      setBackendProgress(0);
      setBackendStatus("Initializing...");
    }
    return () => clearInterval(interval);
  }, [loading, analysis?.filename, loadingText]);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setLoadingText("Scanning CSV Structure...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      // 1. Standard Analysis
      const res = await axios.post("http://localhost:8000/upload", formData);
      setAnalysis(res.data);
      setRowsToGenerate(res.data.recommended_rows);

      // 2. Real AI Analysis (Gemini)
      setLoadingText("Consulting Gemini AI Brain...");
      const aiRes = await axios.post("http://localhost:8000/analyze_ai", {
        filename: res.data.filename,
      });

      // PARSE THE JSON RESPONSE
      try {
        const parsedAI = JSON.parse(aiRes.data.ai_response);
        setAiData(parsedAI);
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            text: `I've analyzed ${res.data.filename}. It looks like ${parsedAI.dataset_topic}. Check the dashboard for my recommendations!`,
          },
        ]);
      } catch (e) {
        console.error("JSON Parse Error", e);
        setAiData({
          dataset_topic: "Complex Dataset",
          model_recommendation: "Hybrid Model",
          privacy_constraints: "Could not parse specific details.",
        });
      }
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  };

  const sendChat = async () => {
    if (!inputMsg) return;
    const userText = inputMsg;
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setInputMsg("");

    try {
      const res = await axios.post("http://localhost:8000/chat", {
        filename: analysis.filename,
        message: userText,
      });
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: res.data.response },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "AI Connection Error." },
      ]);
    }
  };

  // --- REAL GENERATION LOGIC ---
  const handleGenerate = async () => {
    setLoading(true);
    setLoadingText("Initializing Synthetic Data Engine...");

    // Convert the checkbox objects {Name: true, Age: false} into lists ["Name"]
    const frozenList = Object.keys(frozenCols).filter((k) => frozenCols[k]);
    const removedList = Object.keys(removedCols).filter((k) => removedCols[k]);

    try {
      const res = await axios.post("http://localhost:8000/generate_advanced", {
        filename: analysis.filename,
        model_type: modelType,
        rows: parseInt(rowsToGenerate),
        frozen_cols: frozenList,
        removed_cols: removedList,
      });

      setResults(res.data);
      setLoadingText("Generation Complete!");

      // Add a success message to chat
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: `Success! I have generated ${rowsToGenerate} rows of synthetic data. You can download it now.`,
        },
      ]);
    } catch (err) {
      alert(
        "Generation Failed: " + (err.response?.data?.detail || err.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleFreeze = (col) =>
    setFrozenCols((p) => ({ ...p, [col]: !p[col] }));
  const toggleRemove = (col) =>
    setRemovedCols((p) => ({ ...p, [col]: !p[col] }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 relative">
      
      {/* --- NEW: AI GENERATION LOADING OVERLAY --- */}
      {/* --- REAL-TIME AI GENERATION LOADING OVERLAY --- */}
      {loading && loadingText === "Initializing Synthetic Data Engine..." && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border-t-8 border-indigo-600">
            <Brain className="mx-auto text-indigo-600 mb-6 animate-pulse" size={64} />
            <h2 className="text-2xl font-black text-slate-800 mb-2">Synthesizing Data</h2>
            
            {/* Real Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden">
              <div 
                className="bg-indigo-600 h-3 rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${backendProgress}%` }}>
              </div>
            </div>
            
            {/* Percentage Text */}
            <p className="text-right text-xs font-bold text-indigo-600 mb-4">{backendProgress}%</p>

            {/* Real Backend Status Text */}
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest h-10 transition-all">
              {backendStatus}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <Database className="text-blue-600" /> SynData Guard{" "}
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
            GEMINI POWERED
          </span>
        </h1>
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
        >
          <MessageSquare size={18} />{" "}
          {chatOpen ? "Close Chat" : "Chat with Data AI"}
        </button>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT PANEL */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <h2 className="font-bold mb-4 flex gap-2">
              <Upload size={20} className="text-blue-500" /> Data Source
            </h2>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="block w-full text-sm text-slate-500 mb-4"
            />
            <button
              onClick={handleUpload}
              disabled={loading || !file}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold"
            >
              {loading && loadingText !== "Initializing Synthetic Data Engine..." ? loadingText : "Upload & Analyze"}
            </button>
          </div>

          {/* AI INTELLIGENCE DASHBOARD */}
          {aiData && (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
              {/* Card 1: Topic */}
              <div className="bg-white p-5 rounded-xl border-l-4 border-purple-500 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2">
                  <FileText size={14} /> Dataset Context
                </h3>
                <p className="font-bold text-slate-800 text-sm leading-relaxed">
                  {aiData.dataset_topic}
                </p>
              </div>

              {/* Card 2: Recommendation */}
              <div className="bg-white p-5 rounded-xl border-l-4 border-blue-500 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2">
                  <Lightbulb size={14} /> AI Strategy
                </h3>
                <p className="text-sm text-slate-600">
                  {aiData.model_recommendation}
                </p>
              </div>

              {/* Card 3: Privacy */}
              <div className="bg-white p-5 rounded-xl border-l-4 border-red-500 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2 mb-2">
                  <ShieldCheck size={14} /> Privacy Watchlist
                </h3>
                <p className="text-sm text-red-600 font-medium bg-red-50 p-2 rounded-lg">
                  {aiData.privacy_constraints}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Results or Column Manager */}
        <div className="lg:col-span-8">
          {results ? (
            // --- RESULTS DASHBOARD ---
            <div className="bg-white p-8 rounded-2xl border shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-800 flex gap-2">
                  <Activity className="text-green-500" /> Generation Report
                </h2>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase">
                    Fidelity Score
                  </p>
                  <p className="text-4xl font-black text-green-500">
                    {results.accuracy_score}%
                  </p>
                </div>
              </div>

              {/* AI Summary Card */}
              <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 mb-8 flex gap-4">
                <Brain className="text-indigo-600 flex-shrink-0" size={32} />
                <div>
                  <h3 className="font-bold text-indigo-900 mb-2">
                    AI Analyst Summary
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {results.ai_summary}
                  </p>
                </div>
              </div>

              {/* Chart */}
              <div className="h-64 mb-8 bg-slate-50 rounded-xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={results.chart_data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      style={{ fontSize: "10px" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      style={{ fontSize: "10px" }}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="Real"
                      fill="#cbd5e1"
                      name="Real Data"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="Synthetic"
                      fill="#3b82f6"
                      name="Synthetic Data"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <a
                href={results.download_url}
                className="w-full block text-center bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-200 transition-all"
              >
                <Download className="inline mr-2" /> Download Synthetic Dataset
              </a>
            </div>
          ) : // --- COLUMN MANAGER ---
          analysis ? (
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b font-bold text-sm text-slate-500 uppercase flex justify-between">
                <span>Column Manager</span>
                <span>{analysis.columns.length} Cols Detected</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white text-slate-400 text-xs uppercase">
                    <tr>
                      <th className="p-4">Name</th>
                      <th className="p-4">Type</th>
                      <th className="p-4 text-center">Freeze</th>
                      <th className="p-4 text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analysis.columns.map((col) => (
                      <tr
                        key={col.name}
                        className={
                          removedCols[col.name] ? "opacity-30 bg-slate-50" : ""
                        }
                      >
                        <td className="p-4 font-bold text-slate-700">
                          {col.name}
                        </td>
                        <td className="p-4 text-xs text-slate-500">
                          {col.type}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => toggleFreeze(col.name)}
                            disabled={removedCols[col.name]}
                            className={`p-2 rounded-lg ${frozenCols[col.name] ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}
                          >
                            <Lock size={16} />
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => toggleRemove(col.name)}
                            className={`p-2 rounded-lg ${removedCols[col.name] ? "bg-red-500 text-white" : "bg-slate-100 text-slate-400"}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* GENERATION SETTINGS PANEL */}
              <div className="p-5 border-t border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-6 rounded-b-2xl">
                {/* Left Side: Model & Rows */}
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="flex-1 sm:flex-none">
                    <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-wider">
                      AI Engine
                    </label>
                    <select
                      value={modelType}
                      onChange={(e) => setModelType(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full p-3 outline-none font-bold cursor-pointer transition-all"
                    >
                      <option value="hybrid">Hybrid (Auto-Select)</option>
                      <option value="tvae">TVAE (Fast & Standard)</option>
                      <option value="ctgan">CTGAN (Complex Data)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-wider">
                      Rows
                    </label>
                    <input
                      type="number"
                      value={rowsToGenerate}
                      onChange={(e) => setRowsToGenerate(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-24 p-3 outline-none font-bold transition-all"
                    />
                  </div>
                </div>

                {/* Right Side: Estimator & Button */}
                <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">
                      Estimated Time
                    </p>
                    <p className="text-sm font-black text-blue-600">
                      ~{Math.max(1, Math.ceil(rowsToGenerate / 500))} min(s)
                    </p>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 w-full sm:w-auto disabled:opacity-50"
                  >
                    <Activity size={18} />{" "}
                    {loading && loadingText === "Initializing Synthetic Data Engine..." ? "Processing..." : "Generate Data"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-slate-200 text-center text-slate-400 h-96 flex flex-col items-center justify-center">
              <Brain size={64} className="mb-6 opacity-20 text-purple-500" />
              <h3 className="text-xl font-bold text-slate-700 mb-2">
                Waiting for Data
              </h3>
              <p>Upload a CSV file to trigger the Gemini AI Analysis engine.</p>
            </div>
          )}
        </div>
      </main>

      {/* CHAT WINDOW */}
      {chatOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-slate-900 p-4 text-white font-bold flex justify-between items-center shadow-md">
            <span className="flex items-center gap-2">
              <Bot size={18} className="text-green-400" /> AI Assistant
            </span>
            <button
              onClick={() => setChatOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${m.role === "user" ? "bg-blue-600 text-white rounded-br-none" : "bg-white border border-slate-200 text-slate-700 rounded-bl-none"}`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendChat()}
              placeholder="Ask me about privacy risks..."
              className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <button
              onClick={sendChat}
              className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;