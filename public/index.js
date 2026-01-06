import P2PCF from './p2pcf.js';

// --- State ---
let p2pcf;
let localStream;
let myPeerId = 'user-' + Math.floor(Math.random() * 100000);
let roomId = null;
let isAudioEnabled = true;
let isVideoEnabled = true;
let isScreenSharing = false;
let isHD = false;

// --- DOM Elements ---
const landingPage = document.getElementById('landing-page');
const appContainer = document.getElementById('app-container');
const roomInput = document.getElementById('room-input');
const joinBtn = document.getElementById('join-btn');
const videoGrid = document.getElementById('video-grid');
const msgInput = document.getElementById('msg-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('chat-messages');
const sidebar = document.getElementById('sidebar');
const inviteBtn = document.getElementById('invite-btn');
const toast = document.getElementById('toast');
const imgUpload = document.getElementById('img-upload');

// Controls
const micBtn = document.getElementById('mic-btn');
const camBtn = document.getElementById('cam-btn');
const shareBtn = document.getElementById('share-btn');
// const hdBtn = document.getElementById('hd-btn'); // Removed
const leaveBtn = document.getElementById('leave-btn');
const chatToggleBtn = document.getElementById('chat-toggle-btn');
const closeChatBtn = document.getElementById('close-chat');

// --- Initialization ---

function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const room = urlParams.get('room');

  if (room) {
    enterRoom(room);
  } else {
    // Show landing page
    landingPage.classList.remove('hidden');
    appContainer.classList.add('hidden');
  }
}

joinBtn.addEventListener('click', () => {
  let roomVal = roomInput.value.trim();
  if (!roomVal) {
    roomVal = `room-${Math.floor(Math.random() * 1000000)}`;
  } else if (!roomVal.startsWith('room-')) {
    roomVal = `room-${roomVal}`;
  }

  // Update URL without reload
  const url = new URL(window.location.href);
  url.searchParams.set('room', roomVal);
  const newUrl = url.toString();
  window.history.pushState({ path: newUrl }, '', newUrl);
  enterRoom(roomVal);
});

async function enterRoom(room) {
  roomId = room;
  landingPage.style.opacity = '0';
  setTimeout(() => {
    landingPage.classList.add('hidden');
    appContainer.classList.remove('hidden');
  }, 500);

  console.log(`Joining room: ${roomId} as ${myPeerId}`);

  // Initialize P2PCF
  p2pcf = new P2PCF(myPeerId, roomId);
  window.p2pcf = p2pcf; // debug

  setupP2PEvents();

  // Get User Media
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    addVideoStream('local-video', localStream, true);

    // Add to peers who might already be there or join later
    // NOTE: P2PCF handles adding stream to peers in 'peerconnect'

    p2pcf.start();
  } catch (err) {
    console.error("Error accessing media devices:", err);
    alert("Could not access camera/microphone. Please allow permissions.");
  }
}

// --- Video Handling ---

let pinnedVideoId = null;

function addVideoStream(id, stream, isMuted = false) {
  if (document.getElementById(id)) return;

  const vidContainer = document.createElement('div');
  vidContainer.classList.add('video-container'); // Add class for styling
  // vidContainer.style.position = 'relative'; // REMOVED: Managed by CSS (.video-container has relative, .pip has absolute)
  vidContainer.id = id;

  const video = document.createElement('video');
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;
  if (isMuted) video.muted = true;

  vidContainer.appendChild(video);
  videoGrid.appendChild(vidContainer);

  const muteIcon = document.createElement('div');
  muteIcon.classList.add('mute-indicator', 'hidden');
  muteIcon.innerHTML = '<span class="material-icons" style="font-size: 1.2rem; color: white;">mic_off</span>';
  muteIcon.style.cssText = 'position: absolute; bottom: 10px; right: 10px; background: rgba(218, 54, 51, 0.8); padding: 5px; border-radius: 50%; display: flex; align-items: center; justify-content: center;';
  vidContainer.appendChild(muteIcon);

  // --- Layout Logic ---

  if (id === 'local-video') {
    // Minimize button for local video
    const minBtn = document.createElement('button');
    minBtn.classList.add('minimize-btn');
    minBtn.innerHTML = '<span class="material-icons" style="font-size: 14px;">remove</span>';
    minBtn.title = "Minimize/Restore";
    minBtn.onclick = (e) => {
      e.stopPropagation();
      vidContainer.classList.toggle('minimized');
      minBtn.innerHTML = vidContainer.classList.contains('minimized')
        ? '<span class="material-icons" style="font-size: 14px;">crop_square</span>'
        : '<span class="material-icons" style="font-size: 14px;">remove</span>';
    };
    vidContainer.appendChild(minBtn);

    // vidContainer.classList.add('pip'); // REMOVED: Default to normal grid (full screen if alone)

    // Check if we need to auto-pin (e.g. if we are joining a room with people? P2P logic handles that later)
    // For now, just let it be in grid. If we are alone, it will fill the screen (1fr).
    // But wait, the grid is 'display: grid'. ONE item fills it.
    // CSS rules for .pinned vs normal:
    // Normal grid item: fills grid cell.
    // If we want it to look EXACTLY like pinned (100dvh, no padding), we might need to apply 'pinned' if alone?
    // User said: "Show my video like after disconnection (entire screen)".
    // If I just let it be grid, does it use 100dvh?
    // #video-grid has height 100dvh. 
    // video element has max-height removed.
    // So yes, it should fill.

  } else {

    // Fit Toggle Button (for remote)
    const fitBtn = document.createElement('button');
    fitBtn.classList.add('fit-toggle-btn');
    fitBtn.innerHTML = '<span class="material-icons" style="font-size: 16px;">aspect_ratio</span>';
    fitBtn.title = "Toggle Fit/Fill";
    fitBtn.onclick = (e) => {
      e.stopPropagation();
      const v = video;
      if (v.style.objectFit === 'contain') {
        v.style.objectFit = 'cover';
        fitBtn.innerHTML = '<span class="material-icons" style="font-size: 16px;">aspect_ratio</span>';
      } else {
        v.style.objectFit = 'contain';
        fitBtn.innerHTML = '<span class="material-icons" style="font-size: 16px;">fit_screen</span>';
      }
    };
    vidContainer.appendChild(fitBtn);

    // Remote video click -> Toggle Pin
    vidContainer.addEventListener('click', () => {
      if (pinnedVideoId === id) {
        // Unpin
        pinnedVideoId = null;
        videoGrid.classList.remove('has-pinned');
        document.querySelectorAll('.video-container').forEach(el => {
          el.classList.remove('pinned');
          if (el.id === 'local-video') el.classList.remove('pip');
          el.style.display = ''; // reset
          // Reset object fit if needed, or keep preference? Let's reset to cover default
          const v = el.querySelector('video');
          if (v && el.id !== 'local-video') v.style.objectFit = '';
        });
      } else {
        // Pin this one
        pinnedVideoId = id;
        videoGrid.classList.add('has-pinned');
        document.querySelectorAll('.video-container').forEach(el => {
          if (el.id === id) {
            el.classList.add('pinned');
            el.style.display = 'flex'; // Flex for centering
          } else if (el.id === 'local-video') {
            el.classList.add('pip'); // Local goes to PiP
            el.style.display = 'block';
          } else {
            el.classList.remove('pinned');
            el.style.display = 'none'; // Hide others
          }
        });
      }
    });

    // AUTO-PIN check
    // If this is the only remote video, pin it automatically immediately
    const otherRemotes = document.querySelectorAll('.video-container:not(#local-video)');
    if (otherRemotes.length === 1 && !pinnedVideoId) {
      // Trigger pin immediately to seamlessly transition
      vidContainer.click();
    }
  }
}

function removeVideoStream(id) {
  const el = document.getElementById(id);
  if (el) {
    if (pinnedVideoId === id) {
      // Unpin if leaving
      pinnedVideoId = null;
      videoGrid.classList.remove('has-pinned');
      const local = document.getElementById('local-video');
      if (local) local.classList.remove('pip');
    }
    el.remove();
  }
}

// --- P2PCF Events ---

function setupP2PEvents() {
  p2pcf.on('peerconnect', peer => {
    console.log('Peer connected:', peer.id);
    addSystemMessage(`${peer.id.substring(0, 8)} joined the room.`);

    if (localStream) {
      peer.addStream(localStream);
    }

    peer.on('track', (track, stream) => {
      console.log('Got remote track from:', peer.id);
      addVideoStream(`peer-${peer.id}`, stream);

      // Listen for mute/unmute
      track.onmute = () => {
        const el = document.getElementById(`peer-${peer.id}`);
        if (el) el.querySelector('.mute-indicator')?.classList.remove('hidden');
      };

      track.onunmute = () => {
        const el = document.getElementById(`peer-${peer.id}`);
        if (el) el.querySelector('.mute-indicator')?.classList.add('hidden');
      };
    });
  });

  p2pcf.on('peerclose', peer => {
    console.log('Peer disconnected:', peer.id);
    addSystemMessage(`${peer.id.substring(0, 8)} left.`);
    removeVideoStream(`peer-${peer.id}`);
  });

  p2pcf.on('msg', (peer, data) => {
    try {
      const text = new TextDecoder('utf-8').decode(data);
      const msgObj = JSON.parse(text);
      handleIncomingMessage(peer.id, msgObj);
    } catch (e) {
      console.error("Failed to parse message", e);
    }
  });
}

// --- Messaging ---

function sendMessage(text) {
  if (!text.trim()) return;
  const msgObj = { type: 'chat', text: text, sender: myPeerId, timestamp: Date.now() };
  broadcastMessage(msgObj);
  appendMessage(msgObj, true);
  msgInput.value = '';
}

function sendImage(base64) {
  const msgObj = { type: 'image', payload: base64, sender: myPeerId, timestamp: Date.now() };
  broadcastMessage(msgObj);
  appendMessage(msgObj, true);
}

function broadcastMessage(obj) {
  const json = JSON.stringify(obj);
  const enc = new TextEncoder().encode(json);
  p2pcf.broadcast(enc);
}

function handleIncomingMessage(senderId, msgObj) {
  msgObj.sender = senderId; // ensure sender is correct from peer
  appendMessage(msgObj, false);
  if (!sidebar.classList.contains('open')) {
    chatToggleBtn.style.color = '#58a6ff'; // highlight
  }
}

function appendMessage(msg, isSelf) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message');
  if (isSelf) msgDiv.classList.add('self');

  const senderName = isSelf ? "You" : (msg.sender || 'Anon').substring(0, 8);

  let contentHtml = '';
  if (msg.type === 'chat') {
    contentHtml = `<strong>${senderName}</strong>: ${escapeHtml(msg.text)}`;
  } else if (msg.type === 'image') {
    contentHtml = `<strong>${senderName}</strong>:<br><img src="${msg.payload}" onclick="window.open(this.src)">`;
  }

  msgDiv.innerHTML = contentHtml;
  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addSystemMessage(text) {
  const div = document.createElement('div');
  div.classList.add('message');
  div.style.background = 'transparent';
  div.style.textAlign = 'center';
  div.style.color = '#8b949e';
  div.style.fontStyle = 'italic';
  div.innerText = text;
  messagesContainer.appendChild(div);
}

// --- Utils ---

function escapeHtml(text) {
  if (!text) return text;
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(msg) {
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// --- Event Listeners ---

sendBtn.addEventListener('click', () => sendMessage(msgInput.value));
msgInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(msgInput.value); });

chatToggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  chatToggleBtn.style.color = '';
});

closeChatBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  console.log('Close chat clicked'); // Debug
  sidebar.classList.remove('open');
});

inviteBtn.addEventListener('click', () => {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => showToast('Invite Link Copied!'));
});

micBtn.addEventListener('click', () => {
  if (!localStream) return;
  isAudioEnabled = !isAudioEnabled;
  localStream.getAudioTracks().forEach(t => t.enabled = isAudioEnabled);
  micBtn.innerHTML = isAudioEnabled ? '<span class="material-icons">mic</span>' : '<span class="material-icons">mic_off</span>';
  micBtn.classList.toggle('danger', !isAudioEnabled);

  // Update local indicator
  const localInd = document.getElementById('local-video').querySelector('.mute-indicator');
  if (localInd) localInd.classList.toggle('hidden', isAudioEnabled);
});

camBtn.addEventListener('click', () => {
  if (!localStream) return;
  isVideoEnabled = !isVideoEnabled;
  localStream.getVideoTracks().forEach(t => t.enabled = isVideoEnabled);
  camBtn.innerHTML = isVideoEnabled ? '<span class="material-icons">videocam</span>' : '<span class="material-icons">videocam_off</span>';
  camBtn.classList.toggle('danger', !isVideoEnabled);
});

leaveBtn.addEventListener('click', () => {
  window.location.href = window.location.pathname; // go back to landing
});

const fsBtn = document.getElementById('fs-btn');

fsBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => {
      // AUTO PIN first remote user
      const remoteContainers = document.querySelectorAll('.video-container:not(#local-video)');
      if (remoteContainers.length > 0) {
        const firstRemote = remoteContainers[0];
        // Simulate click to pin
        if (pinnedVideoId !== firstRemote.id) {
          firstRemote.click();
        }
      }
    }).catch(e => {
      console.log(e);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().then(() => {
        // Unpin everything when exiting?
        // Or leave as is? User probably wants to go back to grid.
        if (pinnedVideoId) {
          // Find the pinned element and unpin
          const el = document.getElementById(pinnedVideoId);
          if (el) el.click(); // This toggles it off
        }
      });
    }
  }
});

document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) {
    fsBtn.innerHTML = '<span class="material-icons">fullscreen_exit</span>';
  } else {
    fsBtn.innerHTML = '<span class="material-icons">fullscreen</span>';
  }
});

shareBtn.addEventListener('click', async () => {
  if (!isScreenSharing) {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      p2pcf.peers.forEach(peer => {
        const sender = peer._pc.getSenders().find(s => s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });

      // Update local view
      const localVid = document.getElementById('local-video').querySelector('video');
      localVid.srcObject = screenStream;

      screenTrack.onended = () => {
        stopScreenShare();
      };

      isScreenSharing = true;
      shareBtn.classList.add('active');

    } catch (e) {
      console.error(e);
    }
  } else {
    stopScreenShare();
  }
});

// Camera Flip Logic
const flipBtn = document.getElementById('flip-btn');
let currentFacingMode = 'user';

// Check for multiple cameras to show/hide flip button
async function checkCameraSupport() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter(d => d.kind === 'videoinput');
    // If more than 1 camera, allow flipping. 
    // Note: Some desktops return 1 fake device or multiple virtual ones, but usually mobile allows back/front.
    // Better check: 'user' and 'environment' capabilities? enumerateDevices doesn't give facingMode easily without opening.
    // Simple count check is standard heuristic.
    if (videoInputs.length > 1 && flipBtn) {
      flipBtn.style.display = 'flex';
    }
  } catch (e) {
    console.warn("Error checking cameras", e);
  }
}

// Call checking function on init
checkCameraSupport();

if (flipBtn) {
  flipBtn.addEventListener('click', async () => {
    if (!localStream) return;
    if (isScreenSharing) {
      showToast("Cannot switch camera while sharing screen");
      return;
    }

    // Toggle mode
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

    // Fix for "Zoom" issue:
    // Low resolutions often crop the sensor on mobile. Termed "Digital Zoom".
    // Requesting a higher standard resolution (like 1080p) forces the device to use the full sensor width.
    const constraints = {
      video: {
        facingMode: { ideal: currentFacingMode },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    };

    try {
      // Stop old tracks first ensures mobile releases the hardware
      localStream.getVideoTracks().forEach(t => t.stop());

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newVideoTrack = newStream.getVideoTracks()[0];

      // Replace in peers
      p2pcf.peers.forEach(peer => {
        const sender = peer._pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      });

      // Re-assemble local stream
      // We need to keep audio tracks
      // Updating existing localStream object is safer for references.
      localStream.removeTrack(localStream.getVideoTracks()[0]); // Remove old stopped track (if any left)
      localStream.addTrack(newVideoTrack);

      // Update Local Video Element
      const localVid = document.getElementById('local-video').querySelector('video');
      localVid.srcObject = localStream;
      // Note: we might need to reset srcObject to trigger play on some browsers

      // Persist enabled state
      newVideoTrack.enabled = isVideoEnabled;

      showToast(`Switched to ${currentFacingMode === 'user' ? 'Front' : 'Back'} Camera`);

    } catch (err) {
      console.error("Error switching camera:", err);
      showToast("Failed to switch camera");
      // Revert mode indicator if failed
      currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    }
  });
}

function stopScreenShare() {
  if (!localStream) return;
  const videoTrack = localStream.getVideoTracks()[0];

  p2pcf.peers.forEach(peer => {
    const sender = peer._pc.getSenders().find(s => s.track.kind === 'video');
    if (sender) {
      sender.replaceTrack(videoTrack);
    }
  });

  const localVid = document.getElementById('local-video').querySelector('video');
  localVid.srcObject = localStream;

  isScreenSharing = false;
  shareBtn.classList.remove('active');
}

imgUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target.result;
      sendImage(base64);
    };
    reader.readAsDataURL(file);
  }
  imgUpload.value = '';
});


// Start
init();
