// filename: script.js
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const callButton = document.getElementById('call-button');
    const initialCallState = document.getElementById('initial-state');
    const callingState = document.getElementById('calling-state');
    const callStatus = document.getElementById('call-status');
    const contactName = document.getElementById('contact-name');
    const ringtoneAudio = document.getElementById('ringtone');
    const ringingAnimation = document.querySelector('.ringing-animation');
    const hangupButton = document.getElementById('hangup-button');

    // How long the "calling" animation and sound play before connecting (in milliseconds)
    const simulatedCallDuration = 3000; // 3 seconds
    let callTimeoutId; // To store the setTimeout ID for clearing

    /**
     * Initiates the call simulation.
     */
    function startCall() {
        // 1. Update UI to "calling" state
        initialCallState.classList.add('hidden'); // Hide the initial button
        callingState.classList.remove('hidden'); // Show the calling interface

        contactName.textContent = 'AI Model'; // Set contact name
        callStatus.textContent = 'Calling...'; // Set status text
        callStatus.classList.add('status-animating'); // Add pulsating animation to status text

        ringingAnimation.style.animationPlayState = 'running'; // Start the pulsing circle animation
        ringingAnimation.style.opacity = '1'; // Make sure it's visible while animating

        // 2. Play the ringtone audio
        ringtoneAudio.play().catch(error => {
            console.warn("Ringtone playback failed (user interaction required or file missing):", error);
            // Optionally, inform the user if audio doesn't play
            // alert("Please ensure audio is enabled and 'ringtone.mp3' is in the same folder.");
        });

        // 3. Set a timeout to simulate connecting after the specified duration
        callTimeoutId = setTimeout(connectCall, simulatedCallDuration);
    }

    /**
     * Transitions the call simulation to the "connected" state.
     */
    function connectCall() {
        // 1. Stop ringtone playback
        ringtoneAudio.pause();
        ringtoneAudio.currentTime = 0; // Reset audio to the start for next call

        // 2. Update status and stop animations
        callStatus.textContent = 'Connected'; // Change status text
        callStatus.classList.remove('status-animating'); // Stop pulsating text animation

        ringingAnimation.style.animationPlayState = 'paused'; // Pause the pulsing circle animation
        ringingAnimation.style.opacity = '0'; // Hide the pulsing circle

        // 3. Show the hangup button (as the conversation is now live)
        hangupButton.classList.remove('hidden');

        // --- IMPORTANT: This is where you would integrate your AI model ---
        console.log("Connected to AI Model for live conversation!");
        // Example: You would typically start streaming audio to/from your AI model here.
        // E.g., using WebSockets, Web Audio API, or a specific SDK for your AI service.
        // For this simulation, we just log a message.
        // -----------------------------------------------------------------
    }

    /**
     * Ends the current call simulation and resets the UI.
     */
    function endCall() {
        clearTimeout(callTimeoutId); // Clear any pending connection timeout
        ringtoneAudio.pause();
        ringtoneAudio.currentTime = 0;

        // Reset UI to initial state
        callingState.classList.add('hidden'); // Hide calling interface
        initialCallState.classList.remove('hidden'); // Show initial button
        hangupButton.classList.add('hidden'); // Hide hangup button

        // Reset animations and status
        ringingAnimation.style.animationPlayState = 'paused';
        ringingAnimation.style.opacity = '0';
        callStatus.classList.remove('status-animating');
        callStatus.textContent = ''; // Clear status text
    }

    // --- Event Listeners ---
    callButton.addEventListener('click', startCall);
    hangupButton.addEventListener('click', endCall); // Listen for hangup button click
});
