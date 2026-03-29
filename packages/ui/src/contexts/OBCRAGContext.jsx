import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const OBCRAGContext = createContext(null);

export const useOBCRAG = () => {
    const context = useContext(OBCRAGContext);
    if (!context) {
        throw new Error('useOBCRAG must be used within an OBCRAGProvider');
    }
    return context;
};

export const OBCRAGProvider = ({ children }) => {
    const [chatHistory, setChatHistory] = useState([]);
    const [exampleQuestions, setExampleQuestions] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(null);
    const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
    const [error, setError] = useState(null);

    // Check status on mount
    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const status = await window.electronAPI.obcRag.getStatus();
            if (status.success) {
                if (status.status.hasEnvConfig && !status.status.hasApiKey) {
                    console.log('Detected environment configuration, auto-initializing...');
                    await autoInitializeFromEnv();
                } else {
                    setApiKeyConfigured(status.status.hasApiKey || status.status.hasEnvConfig);
                    setIsInitialized(status.status.isInitialized);

                    if (status.status.isInitialized && exampleQuestions.length === 0) {
                        generateQuestions();
                    }
                }
            }
        } catch (err) {
            console.error('Failed to check status:', err);
            setError('Failed to check RAG status');
        }
    };

    const autoInitializeFromEnv = async () => {
        try {
            setIsLoading(true);
            const initResult = await window.electronAPI.obcRag.initialize();
            if (initResult.success) {
                setApiKeyConfigured(true);
                setIsInitialized(true);
                await generateQuestions();
            } else {
                setError(initResult.error || 'Failed to auto-initialize from environment');
            }
        } catch (err) {
            console.error('Auto-initialization failed:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const configureApiKey = async (apiKey) => {
        try {
            setIsLoading(true);
            const result = await window.electronAPI.obcRag.setApiKey(apiKey);
            if (result.success) {
                setApiKeyConfigured(true);
                await initializeOBC(apiKey);
            } else {
                setError(result.error || 'Failed to set API key');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const initializeOBC = async (apiKey) => {
        try {
            setIsLoading(true);
            setUploadProgress({ message: 'Initializing service...', current: 0, total: 12 });

            const initResult = await window.electronAPI.obcRag.initialize(apiKey);
            if (!initResult.success) throw new Error(initResult.error);

            setUploadProgress({ message: 'Creating RAG store...', current: 0, total: 12 });
            const storeResult = await window.electronAPI.obcRag.setupStore();
            if (!storeResult.success) throw new Error(storeResult.error);

            window.electronAPI.obcRag.onUploadProgress((data) => {
                setUploadProgress(data);
            });

            const uploadResult = await window.electronAPI.obcRag.uploadDocuments();
            if (!uploadResult.success) throw new Error(uploadResult.error);

            setUploadProgress({ message: 'Generating example questions...', current: 12, total: 12 });
            await generateQuestions();

            setIsInitialized(true);
            setUploadProgress(null);
        } catch (err) {
            console.error('Initialization failed:', err);
            setError(err.message);
            setUploadProgress(null);
        } finally {
            setIsLoading(false);
        }
    };

    const generateQuestions = async () => {
        try {
            const result = await window.electronAPI.obcRag.generateQuestions();
            if (result.success) {
                setExampleQuestions(result.questions);
            }
        } catch (err) {
            console.error('Failed to generate questions:', err);
        }
    };

    const sendMessage = async (text) => {
        try {
            setIsLoading(true);

            const userMsg = {
                role: 'user',
                content: text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setChatHistory(prev => [...prev, userMsg]);

            const result = await window.electronAPI.obcRag.query(text);

            if (result.success) {
                const aiMsg = {
                    role: 'model',
                    content: result.result.text,
                    groundingChunks: result.result.groundingChunks,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                setChatHistory(prev => [...prev, aiMsg]);
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            console.error('Send message failed:', err);
            const errorMsg = {
                role: 'model',
                content: "I'm sorry, I encountered an error processing your request. Please try again.",
                isError: true,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setChatHistory(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearHistory = () => {
        setChatHistory([]);
    };

    const value = {
        chatHistory,
        exampleQuestions,
        isInitialized,
        isLoading,
        uploadProgress,
        apiKeyConfigured,
        error,
        sendMessage,
        configureApiKey,
        clearHistory,
        initializeOBC
    };

    return (
        <OBCRAGContext.Provider value={value}>
            {children}
        </OBCRAGContext.Provider>
    );
};
