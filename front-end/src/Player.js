import React, { Component } from "react";

export default class Player extends Component {
  constructor(props) {
    super(props);
    this.setCanvasRef = ref => {
      this.canvasRef = ref;
      props.setCanvasRef && props.setCanvasRef(ref);
    };
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.disabled !== this.props.disabled) {
      if (nextProps.disabled) {
        this.disconnect();
      } else {
        this.connect();
      }
    }
  }

  connect() {
    const { address } = this.props;
    if (!address) return;
    this.wsavc = new window.WSAvcPlayer(this.canvasRef, "webgl", 1, 35);
    this.wsavc.connect(
      `${window.location.protocol === "https:" ? "wss" : "ws"}://${address}`,
      () => {
        this.wsavc.playStream();
      }
    );
  }

  disconnect() {
    if (this.wsavc) {
      this.wsavc.disconnect();
      this.wsavc.initCanvas();
      this.wsavc = undefined;
    }
  }

  render() {
    return (
      <div className="player">
        <canvas className="canvas" ref={this.setCanvasRef}></canvas>
      </div>
    );
  }
}
