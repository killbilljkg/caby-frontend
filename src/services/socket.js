export const connectWebSocket = (url, onMessage) => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
        console.log('Connected to WebSocket server');
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('Received WebSocket data:', data); // Debug log
            onMessage(data);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };

    ws.onclose = () => {
        console.log('Disconnected from WebSocket server');
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    return ws;
};
