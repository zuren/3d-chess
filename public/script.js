import THREE from "https://dev.jspm.io/three"
import { GLTFLoader } from "https://dev.jspm.io/three/examples/jsm/loaders/GLTFLoader"

const FOV = 75
const WIDTH = Math.min(window.innerWidth, 900)
const HEIGHT = Math.min(window.innerHeight, 700)
const ASPECT_RATIO = WIDTH / HEIGHT

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
      const colour = c === 0 ? "BLACK" : "WHITE"
      const rowModifier = colour === "BLACK" ? n => 7 - n : n => n

      for (let i = 0; i < 8; i++) {
        this.board.place(i, rowModifier(1), this.createPiece("PAWN", colour))
      }

      this.board.place(0, rowModifier(0), this.createPiece("ROOK", colour))
      this.board.place(7, rowModifier(0), this.createPiece("ROOK", colour))
      this.board.place(1, rowModifier(0), this.createPiece("HORSE", colour))
      this.board.place(6, rowModifier(0), this.createPiece("HORSE", colour))
      this.board.place(2, rowModifier(0), this.createPiece("BISHOP", colour))
      this.board.place(5, rowModifier(0), this.createPiece("BISHOP", colour))
      this.board.place(3, rowModifier(0), this.createPiece("QUEEN", colour))
      this.board.place(4, rowModifier(0), this.createPiece("KING", colour))
    }

    console.log(this.board)
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
const loader = new GLTFLoader()
const mouse = new THREE.Vector2()

const chess = new Chess()

const chessPiecesGroup = new THREE.Group()
const chessBoardGroup = new THREE.Group()
const chessOverlayGroup = new THREE.Group()

const createChessBoard = () => {
  for (let x = 0; x < 8; x++) {
    for (let z = 0; z < 8; z++) {
      const color = (x + z) % 2 === 0 ? 0xFFFFFF : 0x000000
      const geom = new THREE.BoxGeometry(1, 0.2, 1)
      const mat = new THREE.MeshBasicMaterial({ color })
      const cube = new THREE.Mesh(geom, mat)

      chessBoardGroup.add(cube)
      cube.position.set(x - 3.5, 0, z - 3.5)
    }
  }

  for (let x = 0; x < 8; x++) {
    for (let z = 0; z < 8; z++) {
      const geom = new THREE.BoxGeometry(1, 0.2, 1)
      const mat = new THREE.MeshBasicMaterial({ color: "pink", opacity: 0.1, transparent: true })
      const cube = new THREE.Mesh(geom, mat)
      cube.name =

      chessOverlayGroup.add(cube)
      cube.position.set(x - 3.5, 0, z - 3.5)
    }
  }

  scene.add(chessBoardGroup)
  scene.add(chessOverlayGroup)
}

const setChessPiecePosition = (piece, x, z) => {
  piece.position.set(x - 3.5, 0.2, z - 3.5)
}

const placeChessPieces = () => {
  chess.map((tile, x, z) => {
    if (!tile) return

    const color = tile.colour === "BLACK" ? "blue" : "pink"
    const shape = tile.type === "PAWN" ? { width: 0.2, height: 0.5 } :
      tile.type === "ROOK" ? { width: 0.5, height: 0.7 } :
      tile.type === "HORSE" ? { width: 0.4, height: 0.9 } :
      tile.type === "BISHOP" ? { width: 0.2, height: 1 } :
      tile.type === "QUEEN" ? { width: 0.5, height: 1.3 } :
      tile.type === "KING" ? { width: 0.4, height: 1.1 } : null

    const geom = new THREE.BoxGeometry(shape.width, shape.height, shape.width)
    const mat = new THREE.MeshBasicMaterial({ color })
    const cube = new THREE.Mesh(geom, mat)
    cube.name = tile.id

    chessPiecesGroup.add(cube)
    setChessPiecePosition(cube, x, z)
  })
  // for (let side = 0; side < 2; side++) {
  //   for (let x = 0; x < 8; x++) {
  //     const color = side === 0 ? "red" : "blue"
  //     const z = side === 0 ? 1 : 6
  //     const geom = new THREE.BoxGeometry(0.3, 1, 0.3)
  //     const mat = new THREE.MeshBasicMaterial({ color })
  //     const cube = new THREE.Mesh(geom, mat)

  //     chessPiecesGroup.add(cube)
  //     cube.position.set(x - 3.5, 0.2, z - 3.5)
  //   }
  // }

  scene.add(chessPiecesGroup)
}

const setup = async () => {
  return new Promise((resolve, reject) => {
    resolve()
    // loader.load("/chess-pieces.gltf", gltf => {
    //   chessPieces = gltf
    //   resolve()
    // }, undefined, err => reject(err))
  })
}

let selectedPiece = null
let clicked = false
const render = time => {
  requestAnimationFrame(render)

  camera.position.x = 0
  camera.position.y = 6
  camera.position.z = 6
  camera.rotation.x = Math.PI * 1.7

  chess.map((tile, x, z) => {
    if (tile === undefined) return

    chessPiecesGroup.children.forEach(piece => {
      if (piece.name === tile.id)
        setChessPiecePosition(piece, x, z)
    })
  })

  raycaster.setFromCamera(mouse, camera)

  const intersects = raycaster.intersectObjects(scene.children, true)
  const overlay = intersects.find(intersect => {
    return chessOverlayGroup.children.some(c => c.uuid === intersect.object.uuid)
  })

  // console.log(chessOverlayGroup.children)
  chessOverlayGroup.children.forEach(c => c.material.opacity = 0)
  if (overlay) overlay.object.material.opacity = 0.5

  renderer.render(scene, camera)
}

const mousemove = e => {
  mouse.x = ((event.clientX + window.scrollX - renderer.domElement.offsetLeft) / WIDTH) * 2 - 1
  mouse.y = -((event.clientY + window.scrollY - renderer.domElement.offsetTop) / HEIGHT) * 2 + 1
}

const click = e => {
  clicked = true
}

;(async () => {
  try {
    chess.start()

    createChessBoard()
    placeChessPieces()

    renderer.setSize(WIDTH, HEIGHT)
    document.body.appendChild(renderer.domElement)

    await setup()
    // console.log(chessPieces)

    // scene.add(chessPieces.scene)
    console.log(scene.children)
    render(0)

    renderer.domElement.addEventListener("mousemove", mousemove)
    renderer.domElement.addEventListener("click", click)
  } catch (e) {
    console.error(e)
  }
})()
