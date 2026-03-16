const canvas = document.getElementById("game")
const ctx = canvas.getContext("2d")

canvas.width = 800
canvas.height = 600

ctx.fillStyle = "black"
ctx.fillRect(0,0,800,600)

ctx.fillStyle = "white"
ctx.font = "30px sans-serif"
ctx.fillText("Kingdom Wars DX",250,300)
