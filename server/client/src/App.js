import React, { Component } from 'react';
import io from 'socket.io-client'
import './App.css';


const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 512;
const TILE_WIDTH = 64;
const TILE_HEIGHT = 64;



class Player {
  constructor(ctx, game) {
    this.ctx = ctx
    this.game = game
    //position values
    //TODO serverdan al
    this.id = 0;
    this.x = 100;
    this.y = 100;
    this.type = 0;
    this.name = '';
  }

  draw = () => {
    this.ctx.drawImage(
      this.game.images.users[this.type], 0, 0, TILE_WIDTH, TILE_HEIGHT,
      this.x, this.y,
      TILE_WIDTH, TILE_HEIGHT);
    
    
      this.ctx.font = '18px comic sans';
      this.ctx.fillStyle = 'black';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.name, this.x + TILE_WIDTH/2, this.y+15);

  }
};

class Game {
  constructor(ctx, socket) {

    this.socket = socket;
    this.ctx = ctx;
    this.images = {
      tiles: {},
      images: {},
    };
    this.layers = [
      [
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        1, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        1, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        1, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        1, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        1, 0, 0, 0, 0, 0, 0, 0, 0, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1
      ]

    ];

    this.players = [];

    socket.on('PLAYERS_UPDATE', (players) => {
      const newPlayers = [];
      for (var i = 0; i < players.length; i++) {
        const newPlayer = new Player(ctx, this);
        newPlayer.id = players[i].id;
        newPlayer.x = players[i].x;
        newPlayer.y = players[i].y;
        newPlayer.type = players[i].type;
        newPlayer.name = players[i].name;
        newPlayers.push(newPlayer);
      }
      this.players = newPlayers;
    });
  };

  init = async () => {
    const tile0 = await this.loadImage('./assets/layers/0.png');
    const tile1 = await this.loadImage('./assets/layers/1.png');
    const user0 = await this.loadImage('./assets/user/0.png');
    const user1 = await this.loadImage('./assets/user/1.png');
    const user2 = await this.loadImage('./assets/user/2.png');
    const user3 = await this.loadImage('./assets/user/3.png');
    this.images = {
      users: {
        0: user0,
        1: user1,
        2: user2,
        3: user3,
      },
      tiles: {
        0: tile0,
        1: tile1
      }
    }

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }


  onKeyUp = event => {
    const keyCode = event.keyCode;
    //left and right
    if (keyCode === 37 || keyCode === 39) {
      this.socket.emit('PLAYER_DIRECTION_UPDATE', { dirx: 0 })
    }
    //up and down
    if (keyCode === 38 || keyCode === 40) {
      this.socket.emit('PLAYER_DIRECTION_UPDATE', { diry: 0 })
    }
  }

  onKeyDown = event => {
    const keyCode = event.keyCode;
    //left
    if (keyCode === 37) {
      this.socket.emit('PLAYER_DIRECTION_UPDATE', { dirx: -1 })
    }
    //right
    else if (keyCode === 39) {
      this.socket.emit('PLAYER_DIRECTION_UPDATE', { dirx: 1 })
    }
    //up
    if (keyCode === 38) {
      this.socket.emit('PLAYER_DIRECTION_UPDATE', { diry: -1 })
    }
    //down
    else if (keyCode === 40) {
      this.socket.emit('PLAYER_DIRECTION_UPDATE', { diry: 1 })
    }
  }


  loadImage = (src) => {
    var img = new Image();
    var d = new Promise(function (resolve, reject) {
      img.onload = function () {
        resolve(img);
      }.bind(this);

      img.onerror = function () {
        reject('Could not load image: ' + src);
      };
    }.bind(this));

    img.src = src;
    return d;
  }

  update = () => {
    // for (var m =0; m < this.players.length; m++){
    //   const player = this.players[m];
    //   player.update();
    // }
  }

  draw = () => {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const cols = CANVAS_WIDTH / TILE_WIDTH;
    const rows = CANVAS_HEIGHT / TILE_HEIGHT;
    for (var i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      for (var j = 0; j < rows; j++) {
        for (var k = 0; k < cols; k++) {
          const imageType = layer[j * cols + k]
          this.ctx.drawImage(this.images.tiles[imageType], 0, 0, TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH * k, TILE_HEIGHT * j, TILE_WIDTH, TILE_HEIGHT)
        }
      }
    }

    for (var m = 0; m < this.players.length; m++) {
      const player = this.players[m];
      player.draw();
    }
  }
};

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      CURRENT_STEP: '',
      name: '',
      isGameRunning: false,
    };
    this.canvasRef = React.createRef();
    this.lastLoop = null;
  }

  start = async () => {

    var socket = io.connect('http://localhost:5000');

    if (!this.state.isGameRunning) {
      socket.emit('PLAYER_NAME_UPDATE', {name: this.state.name })
      this.game = new Game(this.getCtx(), socket);
      await this.game.init()
      this.loop();
    }
    this.setState(state => ({ isGameRunning: !state.isGameRunning }));


  }

  loop = () => {
    requestAnimationFrame(() => {
      const now = Date.now();
      //if (now - this.lastLoop > (1000 / 30)){
      this.game.update();
      this.game.draw();


      this.lastLoop = Date.now();

      if (this.state.isGameRunning) {
        this.loop();
      }

    })
  }

  getCtx = () => this.canvasRef.current.getContext('2d');


  render() {
    if((typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1)){
      return 'TELEFONDAN OLMAZZZ, BROWSERA GEL';
    }

    return (
      <div style={{ height: '100%' }}>
        {!this.state.isGameRunning ? (
          <div>
            <input type="text" onChange={(evt) => this.setState({ name: evt.target.value.substring(0,13).toLowerCase() })} />
            <button disabled={!this.state.name} onClick={this.start}>START</button>
          </div>) : null}


        <div style={{ height: '100%', display: this.state.isGameRunning ? 'flex' : 'none', justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
          <canvas ref={this.canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
        </div>
      </div>

    );
  }
}

export default App;
