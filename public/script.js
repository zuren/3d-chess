import THREE from "https://dev.jspm.io/npm:three@0.117.1"
import { GLTFLoader } from "https://dev.jspm.io/npm:three@0.117.1/examples/jsm/loaders/GLTFLoader"
import { OrbitControls } from "https://dev.jspm.io/npm:three@0.117.1/examples/jsm/controls/OrbitControls"

const USERNAMES = ["🐵", "🐒", "🦍", "🦧", "🐶", "🐕", "🦮", "🐕‍🦺", "🐩", "🐺", "🦊", "🦝", "🐱", "🐈", "🦁", "🐯", "🐅", "🐆", "🐴", "🐎", "🦄", "🦓", "🦌", "🐮", "🐂", "🐃", "🐄", "🐷", "🐖", "🐗", "🐽", "🐏", "🐑", "🐐", "🐪", "🐫", "🦙", "🦒", "🐘", "🦏", "🦛", "🐭", "🐁", "🐀", "🐹", "🐰", "🐇", "🐿", "🦔", "🦇", "🐻", "🐨", "🐼", "🦥", "🦦", "🦨", "🦘", "🦡", "🦃", "🐔", "🐓", "🐣", "🐤", "🐥", "🐦", "🐧", "🕊", "🦅", "🦆", "🦢", "🦉", "🦩", "🦚", "🦜", "🐸", "🐊", "🐢", "🦎", "🐍", "🐲", "🐉", "🦕", "🦖", "🐳", "🐋", "🐬", "🐟", "🐠", "🐡", "🦈", "🐙", "🐚", "🐌", "🦋", "🐜", "🐝", "🐞", "🦗", "🕷", "🦂", "🦟", "🦠"]

const GAME_EL = document.querySelector(".game")
const CHAT_MESSAGES_EL = document.getElementById("chat-messages")
const CHAT_FORM_EL = document.getElementById("chat-form")
const CHAT_INPUT_EL = document.getElementById("chat-input")

const FOV = 60
const WIDTH = GAME_EL.offsetWidth
const HEIGHT = GAME_EL.offsetHeight
const ASPECT_RATIO = WIDTH / HEIGHT

const RAINBOW_DIST = 2
const RAINBOW_SPEED = 10

class Board {
  constructor (width, height) {
    this.width = width
    this.height = height
    this.board = {}
  }

  map (fn) {
    const output = []

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        output.push(fn(this.board[`${x}/${y}`], x, y))
      }
    }

    return output
  }

  place (x, y, piece) {
    this.board[`${x}/${y}`] = piece
  }
}

class Chess {
  constructor () {
    this.board = new Board(8, 8)
    this.discard = []
  }

  start () {
    for (let c = 0; c < 2; c++) {
      const colour = c === 0 ? "WHITE" : "BLACK"
      const rowModifier = colour === "WHITE" ? n => 7 - n : n => n

      for (let i = 0; i < 8; i++) {
        this.board.place(i, rowModifier(1), { id: `PAWN_${colour}_${i}`, type: "PAWN", colour })
      }

      this.board.place(0, rowModifier(0), { id: `ROOK_${colour}_0`, type: "ROOK", colour })
      this.board.place(7, rowModifier(0), { id: `ROOK_${colour}_1`, type: "ROOK", colour })
      this.board.place(1, rowModifier(0), { id: `HORSE_${colour}_0`, type: "HORSE", colour })
      this.board.place(6, rowModifier(0), { id: `HORSE_${colour}_1`, type: "HORSE", colour })
      this.board.place(2, rowModifier(0), { id: `BISHOP_${colour}_0`, type: "BISHOP", colour })
      this.board.place(5, rowModifier(0), { id: `BISHOP_${colour}_1`, type: "BISHOP", colour })
      this.board.place(3, rowModifier(0), { id: `QUEEN_${colour}_0`, type: "QUEEN", colour })
      this.board.place(4, rowModifier(0), { id: `KING_${colour}_0`, type: "KING", colour })
    }
  }

  map (fn) {
    return this.board.map(fn)
  }

  createPiece (type, colour) {
    const id = type + "_" + Math.random().toString().slice(2)
    return { id, type, colour }
  }
}

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(FOV, ASPECT_RATIO, 0.1, 1000)
const raycaster = new THREE.Raycaster()
const renderer = new THREE.WebGLRenderer({ precision: "highp", antialias: true, alpha: true })
const mouse = new THREE.Vector2()
const controls = new OrbitControls(camera, renderer.domElement)
const loader = new GLTFLoader()

const socket = io()
const roomId = window.location.pathname.slice(1)
const username = USERNAMES[Math.floor(Math.random() * USERNAMES.length)]

const chess = new Chess()

const chessPiecesGroup = new THREE.Group()
const chessBoardGroup = new THREE.Group()
const chessOverlayGroup = new THREE.Group()

const createChessBoard = () => {
  for (let x = 0; x < 24; x++) {
    for (let z = 0; z < 24; z++) {
      const isBoard = x >= 8 && x < 16 && z >= 8 && z < 16
      const color =
        !isBoard ? "rgba(255, 130, 130)" :
        (x + z) % 2 === 0 ? "#fff" : "#000"

      const geom = new THREE.BoxGeometry(1, 0.2, 1)
      const mat = new (isBoard ? THREE.MeshPhongMaterial : THREE.MeshBasicMaterial)({ color })
      const cube = new THREE.Mesh(geom, mat)

      cube.castShadow = false
      cube.receiveShadow = isBoard

      chessBoardGroup.add(cube)
      cube.position.set(x - 3.5 - 8, 0, z - 3.5 - 8)
    }
  }

  for (let x = 0; x < 24; x++) {
    for (let z = 0; z < 24; z++) {
      const geom = new THREE.BoxGeometry(1, 0.2, 1)
      const mat = new THREE.MeshBasicMaterial({ color: "pink", opacity: 0.1, transparent: true })
      const cube = new THREE.Mesh(geom, mat)

      chessOverlayGroup.add(cube)
      cube.position.set(x - 3.5 - 8, 0, z - 3.5 - 8)
    }
  }

  scene.add(chessBoardGroup)
  scene.add(chessOverlayGroup)
}

const loadChessGltfScene = () => {
  return new Promise((resolve, reject) => {
    loader.load("/static/scene.gltf", gltf => {
      resolve(gltf)
    }, undefined, err => reject(err))
  })
}

const placeChessPieces = async () => {
  const chessScene = await loadChessGltfScene()
  const pieces = chessScene.scene.children[0].children[0].children[0].children[0].children

  chess.map((tile, x, z) => {
    if (!tile) return

    const modelName =
      tile.colour === "WHITE" && tile.type === "ROOK" ? "Rook_White_0" :
      tile.colour === "WHITE" && tile.type === "HORSE" ? "Knight_White_0" :
      tile.colour === "WHITE" && tile.type === "BISHOP" ? "Bishop_White_0" :
      tile.colour === "WHITE" && tile.type === "QUEEN" ? "Queen_White_0" :
      tile.colour === "WHITE" && tile.type === "KING" ? "King_White_0" :
      tile.colour === "WHITE" && tile.type === "PAWN" ? "Pawn001_White_0" :
      tile.colour === "BLACK" && tile.type === "ROOK" ? "Rook002_Black_0" :
      tile.colour === "BLACK" && tile.type === "HORSE" ? "Knight002_Black_0" :
      tile.colour === "BLACK" && tile.type === "BISHOP" ? "Bishop002_Black_0" :
      tile.colour === "BLACK" && tile.type === "QUEEN" ? "Queen001_Black_0" :
      tile.colour === "BLACK" && tile.type === "KING" ? "King001_Black_0" :
      tile.colour === "BLACK" && tile.type === "PAWN" ? "Pawn008_Black_0" :
      null

    const model = pieces.find(p => p.children[0].children[0]
      && p.children[0].children[0].name === modelName)

    const piece = model.clone()
    const color = tile.colour === "WHITE" ? "#fff" : "#333"
    const mat = new THREE.MeshPhongMaterial({ color })

    piece.children[0].children[0].material = mat
    piece.children[0].children[0].castShadow = true
    piece.children[0].children[0].receiveShadow = true
    piece.name = tile.id
    piece.scale.x = 0.009
    piece.scale.y = 0.009
    piece.scale.z = 0.009

    chessPiecesGroup.add(piece)
    piece.position.set(x - 3.5, 0.1, z - 3.5)
  })

  scene.add(chessPiecesGroup)
}

const throttle = (fn, ms) => {
  let timer = null
  let throttled = false
  return (...args) => {
    if (throttled) {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => fn(...args), ms)
    } else {
      fn(...args)
    }
  }
}

const emitPieceMoved = throttle(piece => {
  console.log("trying to emit")
  socket.emit("room:event", {
    roomId,
    username,
    type: "PIECE_MOVED",
    id: piece.name,
    x: piece.position.x,
    z: piece.position.z
  })
}, 50)

let selectedPiece = null
let clicked = false
let isMouseDown = false
let lastMousedown = 0
let rainbowLights = []
let lastTime = Date.now()

const render = time => {
  requestAnimationFrame(render)

  const dt = time - lastTime
  lastTime = time

  rainbowLights.forEach(l => {
    l.userData.theta += RAINBOW_SPEED * ((dt % 1000) / 1000)
    l.position.set(RAINBOW_DIST * Math.sin(l.userData.theta), 5, RAINBOW_DIST * Math.cos(l.userData.theta))
  })

  raycaster.setFromCamera(mouse, camera)

  const intersects = raycaster.intersectObjects(scene.children, true)
  const overlay = intersects.find(intersect => {
    return chessOverlayGroup.children.some(c => c.uuid === intersect.object.uuid)
  })

  chessOverlayGroup.children.forEach(c => c.material.opacity = 0)

  if (overlay && !isMouseDown)
    overlay.object.material.opacity = 0.5

  if (overlay && clicked) {
    if (selectedPiece) {
      const hoveredPiece = overlay && chessPiecesGroup.children.find(c =>
        c.position.x === overlay.object.position.x &&
        c.position.z === overlay.object.position.z
      )

      selectedPiece.position.x = overlay.object.position.x
      selectedPiece.position.z = overlay.object.position.z

      emitPieceMoved(selectedPiece)

      selectedPiece = hoveredPiece ? hoveredPiece : null
    } else {
      selectedPiece = chessPiecesGroup.children.find(c => c.position.x === overlay.object.position.x
        && c.position.z === overlay.object.position.z)
    }
  }

  if (selectedPiece) {
    if (overlay) {
      selectedPiece.position.x = overlay.point.x
      selectedPiece.position.z = overlay.point.z
      emitPieceMoved(selectedPiece)
    }
  }

  clicked = false
  renderer.render(scene, camera)
}

const mousemove = e => {
  mouse.x = ((event.clientX + window.scrollX - renderer.domElement.offsetLeft) / WIDTH) * 2 - 1
  mouse.y = -((event.clientY + window.scrollY - renderer.domElement.offsetTop) / HEIGHT) * 2 + 1
}

const mousedown = e => {
  isMouseDown = true
  lastMousedown = Date.now()
}

const mouseup = e => {
  isMouseDown = false
  clicked = Date.now() - lastMousedown < 200
}

;(async () => {
  try {
    chess.start()

    createChessBoard()
    await placeChessPieces()

    renderer.setSize(WIDTH, HEIGHT)
    GAME_EL.appendChild(renderer.domElement)

    camera.position.x = 0
    camera.position.y = 8
    camera.position.z = 8

    controls.enablePan = false
    controls.maxDistance = 12
    controls.minDistance = 4
    controls.maxPolarAngle = Math.PI * 0.4
    controls.update()

    const hemisphereLight = new THREE.HemisphereLight(0xFFFFFF, 0x000000, 1)
    hemisphereLight.castShadow = true
    scene.add(hemisphereLight)

    render(0)

    renderer.domElement.addEventListener("mousemove", mousemove)
    renderer.domElement.addEventListener("mousedown", mousedown)
    renderer.domElement.addEventListener("mouseup", mouseup)

    const addMessage = (username, msg) => {
      const scrolledDown = CHAT_MESSAGES_EL.offsetTop + CHAT_MESSAGES_EL.scrollTop + CHAT_MESSAGES_EL.offsetHeight === CHAT_MESSAGES_EL.scrollHeight

      const el = document.createElement("li")
      el.innerText = `${username} - ${msg}`
      CHAT_MESSAGES_EL.appendChild(el)

      if (scrolledDown) {
        CHAT_MESSAGES_EL.scrollTop = CHAT_MESSAGES_EL.scrollHeight
      }
    }

    // for (let i = 0; i < 100; i++) {
    //   addMessage("🐫", "lets chess it up lets chess it up lets chess it up lets chess it up lets chess it up lets chess it up lets chess it up lets chess it up")
    //   addMessage("🐫", "hiii")
    //   addMessage("🐫", "testo")
    //   addMessage("🐫", "good")
    //   addMessage("🐫", "great")
    //   addMessage("🐫", "lets chess it up")
    // }

    CHAT_FORM_EL.addEventListener("submit", e => {
      e.preventDefault()

      const message = CHAT_INPUT_EL.value
      socket.emit("room:event", { roomId, type: "CHAT_MESSAGE", username, message })

      CHAT_INPUT_EL.value = ""
    })

    socket.on("room:event", event => {
      if (event.type === "USER_LEFT") addMessage("🖥", `${event.username} left`)
      if (event.type === "USER_COUNT") addMessage("🖥", `there are now ${event.count} being(s) here`)
      if (event.type === "USER_JOINED") {
        addMessage("🖥", `${event.username} joined`)

        if (event.username !== username) {
          socket.emit("room:event", {
            roomId,
            type: "INITIAL_STATE",
            piecePositions: chessPiecesGroup.children.map(piece => ({
              id: piece.name,
              x: piece.position.x,
              z: piece.position.z
            }))
          })
        }
      }

      if (event.type === "INITIAL_STATE") {
        event.piecePositions.forEach(pos => {
          const piece = chessPiecesGroup.children.find(p => p.name === pos.id)
          piece.position.x = pos.x
          piece.position.z = pos.z
        })
      }

      if (event.type === "CHAT_MESSAGE") {
        addMessage(event.username, event.message)

        if (event.message === "/party") {
          if (rainbowLights.length === 0) {
            addMessage("🖥", "let the party start")
            const lights = [0xFF0000, 0x00FF00, 0x0000FF]
            rainbowLights = lights.map((colour, i) => {
              const theta = (i + 1) / lights.length * Math.PI * 2

              const pointLight = new THREE.PointLight(colour, 2, 100)
              pointLight.position.set(RAINBOW_DIST * Math.sin(theta), 5, RAINBOW_DIST * Math.cos(theta))
              pointLight.userData.theta = theta
              pointLight.castShadow = true
              scene.add(pointLight)

              return pointLight
            })
          } else {
            addMessage("🖥", "the party has ended, go home")
            rainbowLights.forEach(l => scene.remove(l))
            rainbowLights = []
          }
        }
      }

      if (event.type === "PIECE_MOVED") {
        const piece = chessPiecesGroup.children.find(p => p.name === event.id)
        piece.position.x = event.x
        piece.position.z = event.z
      }
    })

    socket.emit("room:subscribe", { roomId, username })
  } catch (e) {
    console.error(e)
  }
})()
