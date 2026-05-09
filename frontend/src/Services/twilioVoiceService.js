import { Device } from '@twilio/voice-sdk';
import store from '../redux/store';
import { setCallStatus, resetCall } from '../redux/slices/twilioSlice';
import { toast } from 'react-hot-toast';

let device = null;
let currentConnection = null;

const initializeDevice = (token) => {
    if (device) return;

    device = new Device(token, {
        codecPreferences: ['opus', 'pcmu'],
        fakeLocalAudioGrid: false,
    });

    device.on('registered', () => {
    });

    device.on('error', (error) => {
        console.error('Twilio Device Error:', error);
        toast.error(`Call Error: ${error.message}`);
        store.dispatch(setCallStatus('error'));
    });

    device.on('incoming', (connection) => {
        // Handle incoming calls if needed
    });

    device.register();
};

export const makeCall = async (token, phoneNumber) => {
    try {
        if (!device) {
            initializeDevice(token);
        }

        if (device.state === 'unregistered') {
            await device.register();
        }

        store.dispatch(setCallStatus('connecting'));

        const params = {
            To: phoneNumber,
        };

        const connection = await device.connect({ params });
        currentConnection = connection;

        connection.on('accept', () => {
            store.dispatch(setCallStatus('connected'));
        });

        connection.on('disconnect', () => {
            store.dispatch(setCallStatus('ended'));
            setTimeout(() => store.dispatch(resetCall()), 2000);
            currentConnection = null;
        });

        connection.on('reject', () => {
            store.dispatch(setCallStatus('ended'));
            setTimeout(() => store.dispatch(resetCall()), 2000);
            currentConnection = null;
        });

    } catch (error) {
        console.error('Twilio Connect Error:', error);
        toast.error('Failed to connect call');
        store.dispatch(setCallStatus('idle'));
    }
};

export const endCall = () => {
    if (currentConnection) {
        currentConnection.disconnect();
    } else if (device) {
        device.disconnectAll();
    }
    store.dispatch(setCallStatus('ended'));
    setTimeout(() => store.dispatch(resetCall()), 2000);
};

export const cleanupDevice = () => {
    if (device) {
        device.destroy();
        device = null;
    }
};
