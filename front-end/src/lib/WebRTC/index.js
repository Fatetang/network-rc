export default class WebRTC {
  constructor({ video, socket, onError, onSuccess, onClose }) {
    this.video = video;
    this.socket = socket;
    this.onError = onError;
    this.onSuccess = onSuccess;
    this.onClose = onClose;

    // #0 请求 webrtc 连接
    this.socketSend({ type: "connect" })
    this.socket.addEventListener("message", this.onSocketMessage);

  }

  socketSend({ type, payload }) {
    this.socket.send(JSON.stringify({
      action: `webrtc ${type}`,
      payload
    }))
  }

  onSocketMessage = ({ data }) => {
    if (typeof data !== "string") return;
    data = JSON.parse(data);
    const { action, payload } = data;
    if (action.indexOf("webrtc") === -1) return;
    const type = action.split(" ")[1];
    switch (type) {
      case "offer":
        this.onOffer(payload);
        break;

      case "candidate":
        this.onCandidate(payload);
        break;
      default:
        console.log(action)
        break;
    }
  }

  onOffer = async (offer) => {
    // # 4 创建客户端 rc
    const rc = new RTCPeerConnection({
      // iceTransportPolicy: "relay",
      sdpSemantics: 'unified-plan',
      iceServers: [
        {
          urls: 'stun:global.stun.twilio.com:3478?transport=udp'
        },
        {
          urls: "turn:us.esonwong.com:3478",
          username: "eson",
          credential: "networkrc"
        },
        {
          urls: 'stun:stun.l.google.com:19302'
        },
        {
          urls: "stun:stun.ideasip.com"
        },
      ],
    });

    this.rc = rc;

    rc.addEventListener("icecandidate", ({ candidate }) => {
      if (!candidate) return;
      this.socketSend({ type: "candidate", payload: candidate })
      console.log("local candidate", candidate);
    });


    rc.addEventListener("iceconnectionstatechange", function (e) {
      console.log("iceConnectionState", rc.iceConnectionState)
    });

    rc.addEventListener("icecandidateerror", function (e) {
      console.error("icecandidateerror", e);
    });

    rc.addEventListener("connectionstatechange", ({ target }) => {
      console.log("Connection state change", target.connectionState);
      if (target.connectionState === "connected") {
        this.onSuccess();
      }
      if (target.connectionState === "disconnected") {
        this.close();
      }
    });

    // # 5 设置客户端远程 description
    await rc.setRemoteDescription(offer);

    // # 6 获取远程 stream
    console.log("receivers", rc.getReceivers());
    const remoteStream = new MediaStream(rc.getReceivers().map(receiver => receiver.track));
    this.video.srcObject = remoteStream;



    try {
      this.localStream = await window.navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      this.localStream.getTracks().forEach(track => rc.addTrack(track));
    } catch (error) {
      this.onError(new Error("控制端麦克风打开失败 ヾ(°д°)ノ゛！需要 https。你可以使用文字发语音。"));
    }



    // # 7 设置客户端本地 description 传递本地回答详情
    const answer = await rc.createAnswer();
    await rc.setLocalDescription(answer);
    this.socketSend({ type: "answer", payload: answer })
  }

  onCandidate(candidate) {
    // console.log("remote candidate", candidate);
  }

  openMicrophone(enabled) {
    if (!this.localStream) return;
    this.localStream.getAudioTracks()[0].enabled = enabled;
  }


  close() {
    this.socket.removeEventListener("message", this.onSocketMessage);
    this.localStream && this.localStream.getTracks().forEach(track => track.stop());
    this.rc.close();
    this.rc = undefined;
    this.video.srcObject = null;
    this.socketSend({ type: "close" });
    this.onClose();
  }
}


