import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ZeticLLM, ZeticQuantType, ZeticLLMTarget } from 'react-native-zetic-mlange';
import { MODEL_KEY, PERSONAL_ACCESS_KEY } from './src/constants';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ModelStatus {
  isLoaded: boolean;
  hasModel: boolean;
  isGenerating: boolean;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isModelInitialized, setIsModelInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [modelStatus, setModelStatus] = useState<ModelStatus>({
    isLoaded: false,
    hasModel: false,
    isGenerating: false,
  });
  const [initProgress, setInitProgress] = useState(0);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');

  const flatListRef = useRef<FlatList>(null);
  const isListenerSetup = useRef(false);

  useEffect(() => {
    // Setup event listeners using the service
    if (!isListenerSetup.current) {
      ZeticLLM.addListener(handleLLMEvent);
      isListenerSetup.current = true;
    }

    return () => {
      // Cleanup listeners
      ZeticLLM.removeListener();
      isListenerSetup.current = false;
    };
  }, []);

  const handleLLMEvent = (
    type: 'event' | 'error',
    event: any
  ) => {
    console.log('LLM Event:', type, event);
    
    if (type === 'error') {
      handleError(event);
      return;
    }

    // Handle different event types based on the 'type' field in the event
    switch (event.type) {
      case 'progress':
        handleProgress(event);
        break;
      case 'initialized':
        handleInitialized(event);
        break;
      case 'started':
        handleGenerationStarted(event);
        break;
      case 'token':
        handleToken(event);
        break;
      case 'complete':
        handleCompletion(event);
        break;
      case 'cancelled':
        handleCancelled(event);
        break;
      default:
        console.log('Unknown event type:', event.type);
    }
  };

  const handleProgress = (event: { progress: number; message: string }) => {
    setInitProgress(event.progress);
  };

  const handleInitialized = (event: { success: boolean; message: string }) => {
    if (event.success) {
      setIsModelInitialized(true);
      setIsInitializing(false);
      Alert.alert('Success', 'Model initialized successfully!');
    }
  };

  const handleGenerationStarted = (event: { message: string }) => {
    // Add AI message placeholder
    const aiMessage: Message = {
      id: Date.now().toString(),
      text: '',
      isUser: false,
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, aiMessage]);
    setCurrentStreamingMessage('');
  };

  const handleToken = (event: { token: string; fullResponse: string; tokenCount: number }) => {
    setCurrentStreamingMessage(event.fullResponse);
    
    // Update the last message (streaming AI response)
    setMessages(prev => {
      const updated = [...prev];
      const lastMessageIndex = updated.length - 1;
      if (lastMessageIndex >= 0 && !updated[lastMessageIndex].isUser) {
        updated[lastMessageIndex] = {
          ...updated[lastMessageIndex],
          text: event.fullResponse,
        };
      }
      return updated;
    });

    // Auto-scroll to bottom when new token arrives
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleCompletion = (event: { fullResponse: string; tokenCount: string | number; finished: boolean }) => {
    // Finalize the streaming message
    setMessages(prev => {
      const updated = [...prev];
      const lastMessageIndex = updated.length - 1;
      if (lastMessageIndex >= 0 && !updated[lastMessageIndex].isUser) {
        updated[lastMessageIndex] = {
          ...updated[lastMessageIndex],
          text: event.fullResponse,
          isStreaming: false,
        };
      }
      return updated;
    });
    setCurrentStreamingMessage('');
    updateModelStatus();
  };

  const handleError = (event: { error?: string; message: string }) => {
    Alert.alert('Error', event.message || event.error || 'An error occurred');
    setIsInitializing(false);
    setCurrentStreamingMessage('');
    
    // Remove the streaming message if there was an error
    setMessages(prev => {
      const updated = [...prev];
      const lastMessageIndex = updated.length - 1;
      if (lastMessageIndex >= 0 && updated[lastMessageIndex].isStreaming) {
        updated.pop(); // Remove the streaming message
      }
      return updated;
    });
    
    updateModelStatus();
  };

  const handleCancelled = (event: { message: string }) => {
    setCurrentStreamingMessage('');
    
    // Remove the streaming message when cancelled
    setMessages(prev => {
      const updated = [...prev];
      const lastMessageIndex = updated.length - 1;
      if (lastMessageIndex >= 0 && updated[lastMessageIndex].isStreaming) {
        updated.pop(); // Remove the streaming message
      }
      return updated;
    });
    
    updateModelStatus();
  };

  const updateModelStatus = async () => {
    try {
      const status = await ZeticLLM.getModelStatus();
      setModelStatus(status);
    } catch (error) {
      console.error('Failed to get model status:', error);
    }
  };

  const initializeModel = async () => {
    if (isInitializing || isModelInitialized) return;

    setIsInitializing(true);
    setInitProgress(0);

    try {
      // Replace with your actual credentials
      const personalAccessKey = PERSONAL_ACCESS_KEY;
      const modelKey = MODEL_KEY;

      await ZeticLLM.init(
        personalAccessKey,
        modelKey,
        ZeticLLMTarget.LLAMA_CPP,
        ZeticQuantType.Q6_K
      );
    } catch (error) {
      console.error('Model initialization failed:', error);
      Alert.alert('Error', 'Failed to initialize model');
      setIsInitializing(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !isModelInitialized || modelStatus.isGenerating) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Scroll to bottom after adding user message
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      await ZeticLLM.run(userMessage.text, {});
      updateModelStatus();
    } catch (error) {
      console.error('Generation failed:', error);
      Alert.alert('Error', 'Failed to generate response');
    }
  };

  const stopGeneration = async () => {
    try {
      await ZeticLLM.stop();
    } catch (error) {
      console.error('Failed to stop generation:', error);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentStreamingMessage('');
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageContainer, item.isUser ? styles.userMessage : styles.aiMessage]}>
      <Text style={[styles.messageText, item.isUser ? styles.userMessageText : styles.aiMessageText]}>
        {item.text || (item.isStreaming ? '...' : '')}
      </Text>
      {item.isStreaming && (
        <View style={styles.streamingContainer}>
          <ActivityIndicator size="small" color="#666" style={styles.streamingIndicator} />
          <Text style={styles.streamingText}>AI is typing...</Text>
        </View>
      )}
      <Text style={styles.timestamp}>
        {item.timestamp.toLocaleTimeString()}
      </Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>Welcome to Zetic LLM Chat!</Text>
      <Text style={styles.emptyStateText}>
        Start a conversation by typing a message below.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Zetic LLM Chat</Text>
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusDot, 
            { backgroundColor: isModelInitialized ? '#4CAF50' : (isInitializing ? '#FF9800' : '#F44336') }
          ]} />
          <Text style={styles.statusText}>
            {isModelInitialized ? 'Ready' : (isInitializing ? 'Initializing...' : 'Not Initialized')}
          </Text>
        </View>
      </View>

      {!isModelInitialized && (
        <View style={styles.initContainer}>
          <Text style={styles.initTitle}>Initialize Model</Text>
          <Text style={styles.initDescription}>
            You need to initialize the model before you can start chatting.
            Make sure to update the credentials in the code.
          </Text>
          
          {isInitializing && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Initializing... {Math.round(initProgress * 100)}%
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${initProgress * 100}%` }]} />
              </View>
            </View>
          )}
          
          <TouchableOpacity
            style={[styles.initButton, isInitializing && styles.disabledButton]}
            onPress={initializeModel}
            disabled={isInitializing}
          >
            {isInitializing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.initButtonText}>Initialize Model</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isModelInitialized && (
        <>
          <View style={styles.chatContainer}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              style={styles.messagesList}
              contentContainerStyle={messages.length === 0 ? styles.emptyListContainer : undefined}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.inputContainer}
          >
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, modelStatus.isGenerating && styles.disabledInput]}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your message..."
                placeholderTextColor="#999"
                multiline
                maxLength={1000}
                editable={!modelStatus.isGenerating}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
              />
              
              {modelStatus.isGenerating ? (
                <TouchableOpacity style={styles.stopButton} onPress={stopGeneration}>
                  <Text style={styles.stopButtonText}>⏹</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.sendButton, !inputText.trim() && styles.disabledButton]}
                  onPress={sendMessage}
                  disabled={!inputText.trim()}
                >
                  <Text style={styles.sendButtonText}>▶</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.bottomRow}>
              <TouchableOpacity style={styles.clearButton} onPress={clearChat}>
                <Text style={styles.clearButtonText}>Clear Chat</Text>
              </TouchableOpacity>
              
              <Text style={styles.messageCount}>
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </KeyboardAvoidingView>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  initContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  initTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  initDescription: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
    lineHeight: 22,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  progressText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 3,
  },
  initButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  initButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  messageContainer: {
    marginVertical: 4,
    padding: 12,
    borderRadius: 16,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  userMessage: {
    backgroundColor: '#2196F3',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  aiMessageText: {
    color: '#333',
  },
  streamingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  streamingIndicator: {
    marginRight: 8,
  },
  streamingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontWeight: '400',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  disabledInput: {
    backgroundColor: '#f8f8f8',
    color: '#999',
  },
  sendButton: {
    backgroundColor: '#2196F3',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stopButton: {
    backgroundColor: '#F44336',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  clearButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  messageCount: {
    fontSize: 12,
    color: '#999',
    fontWeight: '400',
  },
});

export default App;