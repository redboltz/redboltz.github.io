const BLACK  = {}
const WHITE  = {}
const BORDER = {}
const MAX = 15

function Position() {
    this.initialize.apply(this, arguments)
}
Position.prototype = {
    initialize: function(x, y) {
        this.x = x
        this.y = y
    },
    toString: function() {
        return "(" + sprintf("%2d", this.x + 1) + ", " + String.fromCharCode(65 + this.y) + ")"
    },
    clone: function() {
        return new Position(this.x, this.y)
    },
    equals: function(other) {
        return this.x === other.x && this.y === other.y
    }
}
Position.distance = function(a, b) {
    return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)
}
Position.distanceMax = 14*14*2+1
Position.radialDistanceMax = 15


Position.radialDistance = function(a, b) {
    var absx = Math.abs(a.x - b.x)
    var absy = Math.abs(a.y - b.y)
    if (a.x == b.x) return absy
    if (a.y == b.y) return absx
    if (absx == absy) return absx
    return Position.radialDistanceMax
}

function Score() {
    this.initialize.apply(this, arguments)
}
Score.prototype = {
    initialize: function() {
        this.turn = 0
        this.MAXTurn = 0
        this.history = []
        this.move = BLACK
        this.board = {}
        for (x = 0; x < MAX; ++x) {
            this.board[x] = {}
            for (y = 0; y < MAX; ++y) {
                this.board[x][y] = null
            }
        }
    },
    put: function(pos) {
        this.history[this.turn] = pos
        this.putStone(pos, this.move)
        if (this.move == BLACK) this.move = WHITE
        else this.move = BLACK
        ++this.turn
    },
    pass: function() {
        this.history[this.turn] = new Position(-1, -1)
        if (this.move == BLACK) this.move = WHITE
        else this.move = BLACK
        ++this.turn
    },
    getStone: function(pos) {
        if (pos.x < 0 || pos.x >= MAX || pos.y < 0 || pos.y >= MAX) return BORDER
        return this.board[pos.x][pos.y]
    },
    putStone: function(pos, stone) {
        this.board[pos.x][pos.y] = stone
    },
    getPosition: function(turn) {
        return this.history[turn]
    },
    makeIterator: function(pos, dir) {
        return new Iterator(this, pos, dir)
    }
}
Score.Y_PROHIBITED = {}
Score.Y_WIN        = {}
Score.Y_6          = {}
Score.Y_5          = {}
Score.Y_4          = {}
Score.Y_4R         = {}
Score.Y_44         = {}
Score.Y_43         = {}
Score.Y_33         = {}
Score.Y_3          = {}

function Iterator() {
    this.initialize.apply(this, arguments)
}
Iterator.prototype = {
    initialize: function(ref, pos, dir) {
        this.ref = ref
        this.pos = pos.clone()
        this.dir = dir
    },
    inc: function() {
        this.pos.x += this.dir.x
        this.pos.y += this.dir.y
    },
    dec: function() {
        this.pos.x -= this.dir.x
        this.pos.y -= this.dir.y
    },
    get: function() {
        return this.ref.getStone(this.pos)
    },
    put: function(stone) {
        this.ref.putStone(this.pos, stone)
    },
    getPosition: function() {
        return this.pos.clone()
    }
}
Iterator.DIR_LR = { x:1, y:0 }
Iterator.DIR_UD = { x:0, y:1 }
Iterator.DIR_LU = { x:1, y:-1 }
Iterator.DIR_LD = { x:1, y:1 }


$(window).on('load', function() {
    const STONE_SIZE    = 15
    const BASE          = 32
    const CANVAS_WIDTH  = BASE * (MAX + 1)
    const CANVAS_HEIGHT = BASE * (MAX + 1)

    var score = {}
    var goban      = document.getElementById('goban')
    var stone      = document.getElementById('stone')
    var number     = document.getElementById('number')
    var focus      = document.getElementById('focus')
    var yaku       = document.getElementById('yaku')
    var guide      = document.getElementById('guide')
    var altStone   = document.getElementById('alt_stone')
    var input      = document.getElementById('input')
    var start      = document.getElementById('start')
    var pass       = document.getElementById('pass')
    var resign     = document.getElementById('resign')
    var altMove    = document.getElementById('alt_move')
    var showNumber = document.getElementById('show_number')
    var showYaku   = document.getElementById('show_yaku')
    var gameType   = document.getElementById('gametype')
    if ( ! goban || ! goban.getContext ) return false
    var ctxStone    = stone.getContext('2d')
    var ctxNumber   = number.getContext('2d')
    var ctxFocus    = focus.getContext('2d')
    var ctxYaku     = yaku.getContext('2d')
    var ctxGuide    = guide.getContext('2d')
    var ctxAltStone = altStone.getContext('2d')
    var scoreView = document.getElementById("scoreView")

    const COM   = {}
    const HUMAN = {}
    var blackPlayer = HUMAN
    var whitePlayer = HUMAN

    var playing = false
    var openingMove = 0
    var yakuPositions
    var alt5first = null
    var alt5second = null
    var symPos = []

    drawBoard(goban.getContext('2d'))

    $(pass).prop('disabled', true)
    $(resign).prop('disabled', true)

    // Checkboxes
    $(showNumber).on('change', function(e) {
        ctxNumber.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        if (showNumber.checked)
            for (i = 0; i < score.turn; ++i)
                putNumber(ctxNumber, score.getPosition(i), i + 1)
    })
    $(showYaku).on('change', function(e) {
        ctxYaku.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        if (showYaku.checked) putYaku(ctxYaku, yakuPositions)
    })

    // Dropdown
    $(gameType).on('change', function(e) {
        var id = this.options[this.selectedIndex].id
        if (id == "BHvWH") {
            blackPlayer = HUMAN
            whitePlayer = HUMAN
        }
        else if (id == "BHvWC") {
            blackPlayer = HUMAN
            whitePlayer = COM
        }
        else if (id == "BCvWH") {
            blackPlayer = COM
            whitePlayer = HUMAN
        }
    })


    // Start click
    $(start).on('click', function() {
        playing = true
        $(resign).prop('disabled', false)
        $(gameType).prop('disabled', true)
        $(altMove).prop('disabled', true)
        $(pass).prop('disabled', true)
        score = new Score()
        $(scoreView).empty()
        var scoreText = "  "
        var $pre = $('<pre>').text(scoreText)
        var $newLi = $('<li>').append($pre).appendTo(scoreView)
        $(scoreView).parent().scrollTop($(scoreView)[0].scrollHeight)
        ctxStone.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        ctxYaku.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        ctxFocus.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        ctxNumber.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        ctxAltStone.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        symPos = []
        if (blackPlayer == HUMAN) {
            var pos = new Position(7, 7)
            score.put(pos)
            putStone(ctxStone, pos)
            if (showNumber.checked) putNumber(ctxNumber, pos, score.turn)
            if (altMove.checked) {
                alt5first = null
                alt5second = null
            }
            var scoreText = sprintf("%3d: %s: %s", 1, "Black", pos.toString())
            var $pre = $('<pre>').text(scoreText)
            var $newLi = $('<li>').append($pre).appendTo(scoreView)
            moveFocus($newLi)
            $(scoreView).parent().scrollTop($(scoreView)[0].scrollHeight)
            drawGuide(ctxGuide)
        }
    })

    // Resign click
    $(resign).on('click', function() {
        playing = false
        $(resign).prop('disabled', true)
        $(gameType).prop('disabled', false)
        $(altMove).prop('disabled', false)
    })

    // Pass click
    $(pass).on('click', function() {
        score.pass()
        drawGuide(ctxGuide)
    })

    // Score list click
    $(scoreView).on('click', 'li', function() {
        moveFocus($(this))
    })

    // Board click
    $(input).on('mousedown', function(e) {
        if (!playing) return
        if (score.move == BLACK && blackPlayer == COM) return
        if (score.move == WHITE && whitePlayer == COM) return
        var pos = adjustXY(e)
        var stone = score.getStone(pos)
        if (stone == BLACK || stone == WHITE) return

        if (altMove.checked) {
            if (score.turn == 1) {
                if (pos.x < 6 || pos.x > 8 || pos.y < 6 || pos.y > 8) return
            }
            if (score.turn == 2) {
                if (pos.x < 5 || pos.x > 9 || pos.y < 5 || pos.y > 9) return
            }
            if (score.turn == 4) {
                if (alt5first == null) {
                    alt5first = pos
                    putStoneDirect(ctxStone, pos, BLACK)
                    putNumberWithColor(ctxAltStone, pos, "5A", "#00FF00")
                    symPos = getSymmetricPositions(pos)
                    for (var i = 0; i < symPos.length; ++i) {
                        putNumberWithColor(ctxAltStone, symPos[i], "NG", "#FF1111")
                    }
                    drawGuide(ctxGuide)
                    return
                }
                if (alt5second == null) {
                    if (pos.equals(alt5first)) return
                    for (var i = 0; i < symPos.length; ++i) {
                        if (pos.equals(symPos[i])) return
                    }
                    alt5second = pos
                    putStoneDirect(ctxStone, pos, BLACK)
                    putNumberWithColor(ctxAltStone, pos, "5B", "#00FF00")
                    drawGuide(ctxGuide)
                    return
                }
                if (pos.equals(alt5first)) {
                    clearStone(ctxStone, alt5second)
                    clearNumber(ctxNumber, alt5first)
                    clearNumber(ctxNumber, alt5second)
                    pos = alt5first
                }
                else if (pos.equals(alt5second)) {
                    clearStone(ctxStone, alt5first)
                    clearNumber(ctxNumber, alt5first)
                    clearNumber(ctxNumber, alt5second)
                    pos = alt5second
                }
                else {
                    return
                }
                ctxAltStone.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
            }
        }


        // Update Internal Model
        score.put(pos)

        if (score.turn == 5) {
            $(pass).prop('disabled', false)
        }


        // Update Score View
        stone = score.getStone(pos)
        var stoneString = stone == BLACK ? "Black" : "White"
        var scoreText = sprintf("%3d: %s: %s", score.turn, stoneString, pos.toString())
        var $pre = $('<pre>').text(scoreText)
        var $newLi = $('<li>').append($pre).appendTo(scoreView)
        moveFocus($newLi)
        $(scoreView).parent().scrollTop($(scoreView)[0].scrollHeight)

        if (score.turn == 3) {
            var $kata = $(scoreView).children(":first").children("pre")
            var scoreText = "     "
            scoreText += getKata()
            $kata.text(scoreText)
        }

        // Update Board View
        putStone(ctxStone, pos)
        var result = checkYaku(pos)
        if (result) {
            yakuPositions = result.positions
        }
        else {
            yakuPositions = null
        }
        if (showNumber.checked) putNumber(ctxNumber, pos, score.turn)
        if (showYaku.checked)   putYaku(ctxYaku, yakuPositions)
        setFocus(ctxFocus, pos)

        // Dialog
        if (result) {
            if (result.yaku == Score.Y_WIN) {
                if (stone == BLACK) {
                    alert("BLACK WIN")
                }
                else if (stone == WHITE) {
                    alert("WHITE WIN")
                }
            }
            else if (stone == BLACK && (result.yaku == Score.Y_6 || result.yaku == Score.Y_44 || result.yaku == Score.Y_33)) {
                alert("BLACK MOVE IS PROHIBITED, WHITE WIN")
            }

        }
        drawGuide(ctxGuide)
/*
        if ((score.turn % 2 == 0 && blackPlayer == COM) ||
            (score.turn % 2 != 0 && whitePlayer == COM)) {
            var buf = []
            $.each(score.history, function() {
                buf.push(this.x)
                buf.push(this.y)
            })
            var ws = new WebSocket("ws://localhost:9002")
            ws.binaryType = 'arraybuffer'
            ws.onopen = function()
            {
                // Web Socket is connected, send data using send()
                ws.send(msgpack.toByteArray(msgpack.pack(buf)))
            }
        }
*/
    })
    // Score View
    var lastLi
    $("#scorediv").on('keydown',function(e) {
        if (!lastLi) return
        if (e.keyCode == 38) {      // Up
            var lastIdx = $(lastLi).index()
            if (lastIdx != 0) {
                var obj = $("li:eq(_)".replace('_', lastIdx-1))
                moveFocus(obj)
            }
        }
        else if (e.keyCode == 40) { // Down
            var lastIdx = $(lastLi).index()
            if (lastIdx != scoreView.childNodes.length - 1) {
                var obj = $("li:eq(_)".replace('_', lastIdx+1))
                moveFocus(obj)
            }
        }
        if (e.preventDefault)  e.preventDefault()
        if (e.stopPropagation) e.stopPropagation()
    })

    // Internal Functions for View
    function moveFocus(obj) {
        var idx = obj.index() - 1
        if (idx < 0) return
        setFocus(ctxFocus, score.getPosition(idx))
        if (lastLi) lastLi.css("background-color", "white").css("color", "black")
        lastLi = obj
        lastLi.css("background-color", "blue").css("color", "white")
    }
    function adjustXY(e) {
        var rect = e.target.getBoundingClientRect()
        mouseX = e.clientX - rect.left
        mouseY = e.clientY - rect.top
        var boardX = Math.floor((mouseX - BASE / 2) / BASE)
        var boardY = Math.floor((mouseY - BASE / 2) / BASE)
        if (boardX < 0)    boardX = 0
        if (boardX >= MAX) boardX = MAX - 1
        if (boardY < 0)    boardY = 0
        if (boardY >= MAX) boardY = MAX - 1
        return new Position(boardX, boardY)
    }
    function drawBoard(ctx) {
        // BG
        ctx.fillStyle = "#FCDC5F"
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        // Line
        ctx.fillStyle = "#000000"
        ctx.strokeStyle = "#000000"
        ctx.beginPath()
        for (i = 0; i < MAX; ++i) {
            ctx.moveTo(BASE * (i + 1), BASE)
            ctx.lineTo(BASE * (i + 1), BASE * MAX)
            ctx.moveTo(BASE, BASE * (i + 1))
            ctx.lineTo(BASE * MAX, BASE * (i + 1))
        }
        ctx.closePath()
        ctx.stroke()
        // Marker
        const CENTER = (MAX + 1) / 2
        ctx.arc(CENTER * BASE      , CENTER * BASE      , 5, 0, Math.PI * 2, false)
        ctx.closePath()
        ctx.fill()
        ctx.arc((CENTER - 4) * BASE, (CENTER - 4) * BASE, 4, 0, Math.PI * 2, false)
        ctx.closePath()
        ctx.fill()
        ctx.arc((CENTER + 4) * BASE, (CENTER - 4) * BASE, 4, 0, Math.PI * 2, false)
        ctx.closePath()
        ctx.fill()
        ctx.arc((CENTER - 4) * BASE, (CENTER + 4) * BASE, 4, 0, Math.PI * 2, false)
        ctx.closePath()
        ctx.fill()
        ctx.arc((CENTER + 4) * BASE, (CENTER + 4) * BASE, 4, 0, Math.PI * 2, false)
        ctx.closePath()
        ctx.fill()
        // Text
        ctx.globalAlpha = 1
        ctx.fillStyle = "#666666"
        ctx.font = "12px 'Times New Roman'"
        for (i = 0; i < MAX; ++i) {
            ctx.fillText(String.fromCharCode(65 + i), 6, (i + 1) * BASE)
        }
        for (i = 0; i < 9; ++i) {
            ctx.fillText(i + 1, (i + 1) * BASE, BASE - BASE / 2)
        }
        for (; i < MAX; ++i) {
            ctx.fillText(i + 1, (i + 1) * BASE - 6, BASE - BASE / 2)
        }
    }
    function putStoneDirect(ctx, pos, stone) {
        ctx.beginPath()
        if (stone == BLACK) {
            ctx.fillStyle = ctx.createRadialGradient(
                (pos.x + 1) * BASE - 6,
                (pos.y + 1) * BASE - 6,
                0,
                (pos.x + 1) * BASE,
                (pos.y + 1) * BASE,
                STONE_SIZE)
            ctx.fillStyle.addColorStop(0  , "#AAAAAA")
            ctx.fillStyle.addColorStop(0.3, "#666666")
            ctx.fillStyle.addColorStop(1  , "#222222")
        }
        else if (stone == WHITE) {
            ctx.fillStyle = ctx.createRadialGradient(
                (pos.x + 1) * BASE - 6,
                (pos.y + 1) * BASE - 6,
                0,
                (pos.x + 1) * BASE,
                (pos.y + 1) * BASE,
                STONE_SIZE)
            ctx.fillStyle.addColorStop(0  , "#FFFFFF")
            ctx.fillStyle.addColorStop(0.8, "#DDDDDD")
            ctx.fillStyle.addColorStop(1  , "#BBBBBB")
        }
        else {
            ctx.clearRect(
                (pos.x + 1) * BASE - BASE / 2,
                (pos.y + 1) * BASE - BASE / 2,
                BASE,
                BASE)
        }
        ctx.arc(
            (pos.x + 1) * BASE,
            (pos.y + 1) * BASE,
            STONE_SIZE,
            0,
            Math.PI * 2,
            false)
        ctx.fill()
    }
    function putStone(ctx, pos) {
        var stone = score.getStone(pos)
        putStoneDirect(ctx, pos, stone)
    }
    function clearStone(ctx, pos) {
        ctx.beginPath()
        ctx.clearRect(
            (pos.x + 1) * BASE - BASE / 2,
            (pos.y + 1) * BASE - BASE / 2,
            BASE,
            BASE)
    }
    function setFocus(ctx, pos) {
        ctx.beginPath()
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        ctx.lineWidth = 4
        ctx.strokeStyle = "#0066FF"
        var size = BASE / 2
        ctx.arc(
            (pos.x + 1) * BASE,
            (pos.y + 1) * BASE,
            size,
            0,
            Math.PI * 2,
            false)
        ctx.stroke()
    }
    function putNumberWithColor(ctx, pos, no, color) {
        ctx.beginPath()
        ctx.textAlign = "center"
        ctx.fillStyle = color
        ctx.font = "16px 'Times New Roman'"
        ctx.fillText(no, (pos.x + 1) * BASE, (pos.y + 1) * BASE + 6)
    }
    function putNumber(ctx, pos, no) {
        putNumberWithColor(ctx, pos, no, "#33CC33")
    }
    function clearNumber(ctx, pos) {
        ctx.beginPath()
        ctx.clearRect(
            (pos.x + 1) * BASE - BASE / 2,
            (pos.y + 1) * BASE - BASE / 2,
            BASE,
            BASE)
    }
    function putYaku(ctx, positions) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        if (positions) {
            ctx.lineWidth = 3
            ctx.strokeStyle = "#FF0066"
            var size = BASE / 2 - 2
            $.each(positions, function(i, pos){
                ctx.beginPath()
                ctx.arc((pos.x + 1) * BASE, (pos.y + 1) * BASE, size, 0, Math.PI * 2, false)
                ctx.stroke()
            })
        }
    }

    function draw2ndGuide(ctx) {
        ctx.beginPath()
        ctx.textAlign = "center"
        ctx.fillStyle = "#0066FF"
        ctx.font = "16px 'Times New Roman'"
        ctx.fillText("Tentative BLACK player's turn: Put WHITE stone in the rectangle", 8 * BASE, 15 * BASE + BASE / 2 + 12)
        ctx.lineWidth = 3
        ctx.strokeStyle = "#0066FF"
        var margin = BASE*0.3
        ctx.rect((8-2)*BASE+margin, (8-2)*BASE+margin, BASE*4-margin*2, BASE*4-margin*2)
        ctx.stroke()
    }
    function draw3rdGuide(ctx) {
        ctx.beginPath()
        ctx.textAlign = "center"
        ctx.fillStyle = "#0066FF"
        ctx.font = "16px 'Times New Roman'"
        ctx.fillText("Tentative BLACK player's turn: Put BLACK stone in the rectangle", 8 * BASE, 15 * BASE + BASE / 2 + 12)
        ctx.lineWidth = 3
        ctx.strokeStyle = "#0066FF"
        var margin = BASE*0.3
        ctx.rect((8-3)*BASE+margin, (8-3)*BASE+margin, BASE*6-margin*2, BASE*6-margin*2)
        ctx.stroke()
    }
    function drawSwapGuide(ctx) {
        ctx.beginPath()
        ctx.textAlign = "center"
        ctx.fillStyle = "#FCDC5F"
        ctx.fillRect(0, 14*BASE, CANVAS_WIDTH, BASE*2)
        ctx.fillStyle = "#0066FF"
        ctx.font = "16px 'Times New Roman'"
        ctx.fillText("Tentative WHITE player's turn: Choose BLACK or WHITE.", 8 * BASE, 14 * BASE + BASE / 2 + 12)
        ctx.fillText("then WHITE player put WHITE stone.", 8 * BASE, 15 * BASE + BASE / 2 + 12)
    }
    function draw5_1Guide(ctx) {
        ctx.beginPath()
        ctx.textAlign = "center"
        ctx.fillStyle = "#0066FF"
        ctx.font = "16px 'Times New Roman'"
        ctx.fillText("BLACK player's turn: Put the 1st candidate BLACK stone", 8 * BASE, 15 * BASE + BASE / 2 + 12)
    }
    function draw5_2Guide(ctx) {
        ctx.beginPath()
        ctx.textAlign = "center"
        ctx.fillStyle = "#0066FF"
        ctx.font = "16px 'Times New Roman'"
        ctx.fillText("BLACK player's turn: Put the 2nd candidate BLACK stone", 8 * BASE, 15 * BASE + BASE / 2 + 12)
    }
    function draw5removeGuide(ctx) {
        ctx.beginPath()
        ctx.textAlign = "center"
        ctx.fillStyle = "#0066FF"
        ctx.font = "16px 'Times New Roman'"
        ctx.fillText("WHITE player's turn: Choose the BLACK stone to decide", 8 * BASE, 15 * BASE + BASE / 2 + 12)
    }
    function drawNormalGuide(ctx) {
        ctx.beginPath()
        ctx.textAlign = "center"
        ctx.fillStyle = "#0066FF"
        ctx.font = "16px 'Times New Roman'"
        var stoneStr = score.move == BLACK ? "BLACK" : "WHITE"
        ctx.fillText(stoneStr +" player's turn: Put " + stoneStr + " stone", 8 * BASE, 15 * BASE + BASE / 2 + 12)
    }
    function drawGuide(ctx) {
        ctxGuide.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        switch (score.turn) {
        case 1:
            if (altMove.checked) {
                draw2ndGuide(ctx)
                return
            }
            break
        case 2:
            if (altMove.checked) {
                draw3rdGuide(ctx)
                return
            }
            break
        case 3:
            if (altMove.checked) {
                drawSwapGuide(ctx)
                return
            }
            break
        case 4:
            if (altMove.checked) {
                if (alt5first == null) {
                    draw5_1Guide(ctx)
                    return
                }
                if (alt5second == null) {
                    draw5_2Guide(ctx)
                    return
                }
                draw5removeGuide(ctx)
                return
            }
            break
        }
        drawNormalGuide(ctx)
    }

    // Internal Functions for Model
    function checkYaku(pos) {
        var stone = score.getStone(pos)
        if (stone == WHITE) {
            var r = isWin(pos)
            if (r) return r
            r = isOver6(pos)
            if (r) {
                r.yaku = Score.Y_WIN
                return r
            }
            var r4 = is4(pos)
            if (r4) {
                if (r4.yaku == Score.Y_44) return r4
                if (r4.yaku == Score.Y_4R) return r4
            }
            var r3 = is3(pos)
            if (r4 && r3) {
                var positions = {}
                $.each(r3.positions, function(i, v){
                    positions[v] = v
                })
                $.each(r4.positions, function(i, v){
                    positions[v] = v
                })
                return { "yaku":Score.Y_43, "positions":positions}
            }
            if (r4) return r4
            if (r3) return r3
        }
        else if (stone == BLACK) {
            var r = isWin(pos)
            if (r) return r
            r = isOver6(pos)
            if (r) return r
            var r4 = is4(pos)
            var r3 = is3(pos)
            if (r4 && r4.yaku == Score.Y_44) return r4
            if (r3 && r3.yaku == Score.Y_33) return r3
            if (r4 && r4.yaku == Score.Y_4R) return r4
            if (r4 && r3) {
                var positions = {}
                $.each(r3.positions, function(i, v){
                    positions[v] = v
                })
                $.each(r4.positions, function(i, v){
                    positions[v] = v
                })
                return { "yaku":Score.Y_43, "positions":positions}
            }
            if (r4 && r4.yaku == Score.Y_4) return r4
            if (r3 && r3.yaku == Score.Y_3) return r3
        }
        return null
    }
    function isWin(pos) {
        var r = null
        $.each([Iterator.DIR_LR, Iterator.DIR_UD, Iterator.DIR_LU, Iterator.DIR_LD], function(i, dir){
            if (r == null) {
                var result = is5OneWay(pos, dir)
                if (result && result.yaku == Score.Y_5) {
                    r = { "yaku":Score.Y_WIN, "positions":result.positions }
                }
            }
        })
        return r
    }
    function isProhibited(pos) {
        var stone = score.getStone(pos)
        if (stone == BLACK) {
            if (isOver6(pos)) return true
            var r4 = is4(pos)
            var r3 = is3(pos)
            if (r4 && r4.yaku == Score.Y_44) return true
            if (r3 && r3.yaku == Score.Y_33) return true
        }
        return false
    }
    function isOver6(pos) {
        var r = null
        $.each([Iterator.DIR_LR, Iterator.DIR_UD, Iterator.DIR_LU, Iterator.DIR_LD], function(i, dir){
            if (r == null) {
                var result = isOver6OneWay(pos, dir)
                if (result && result.yaku == Score.Y_6) {
                    r = { "yaku":Score.Y_6, "positions":result.positions }
                }
            }
        })
        return r
    }
    function is4(pos) {
        var positions = {}
        var count = 0
        var y44detected = false
        var y4rdetected = false
        $.each([Iterator.DIR_LR, Iterator.DIR_UD, Iterator.DIR_LU, Iterator.DIR_LD], function(i, dir){
            if (y44detected) return
            var result = is4OneWay(pos, dir)
            if (result) {
                if (result.yaku == Score.Y_44) {
                    y44detected = true
                    $.each(result.positions, function(i, v){
                        positions[v] = v
                    })
                }
                else if (result.yaku == Score.Y_4 || result.yaku == Score.Y_4R) {
                    if (result.yaku == Score.Y_4R) {
                        y4rdetected = true
                    }
                    ++count
                    $.each(result.positions, function(i, v){
                        positions[v] = v
                    })
                }
            }
        })
        if (y44detected || count >= 2) {
            return { "yaku":Score.Y_44, "positions":positions }
        }
        else if (count == 1) {
            if (y4rdetected) {
                return { "yaku":Score.Y_4R, "positions":positions }
            }
            return { "yaku":Score.Y_4, "positions":positions }
        }
        else {
            return null
        }
    }
    function is3(pos) {
        var positions = {}
        var count = 0
        $.each([Iterator.DIR_LR, Iterator.DIR_UD, Iterator.DIR_LU, Iterator.DIR_LD], function(i, dir){
            var result = is3OneWay(pos, dir)
            if (result && result.yaku == Score.Y_3) {
                ++count
                $.each(result.positions, function(i, v){
                    positions[v] = v
                })
            }
        })
        if (count >= 2) {
            return { "yaku":Score.Y_33, "positions":positions }
        }
        else if (count == 1) {
            return { "yaku":Score.Y_3, "positions":positions }
        }
        else {
            return null
        }
    }
    function isOver6OneWay(pos, dir) {
        var stone = score.getStone(pos)
        if (stone != BLACK && stone != WHITE) return null
        var count = 0
        var result = {}
        result[pos] = pos
        ++count;
        $.each([Iterator.prototype.inc, Iterator.prototype.dec], function(i, mover) {
            var it = score.makeIterator(pos, dir)
            while (true) {
                mover.apply(it)
                var current = it.get()
                if (current == stone) {
                    var curPos = it.getPosition()
                    result[curPos] = curPos
                    ++count
                }
                else break;
            }
        })
        if (count >= 6) {
            return { "yaku":Score.Y_6, "positions":result }
        }
        return false
    }
    function is5OneWay(pos, dir) {
        var stone = score.getStone(pos)
        if (stone != BLACK && stone != WHITE) return null
        var count = 0
        var result = {}
        result[pos] = pos
        ++count
        $.each([Iterator.prototype.inc, Iterator.prototype.dec], function(i, mover) {
            var it = score.makeIterator(pos, dir)
            while (true) {
                mover.apply(it)
                var current = it.get()
                if (current == stone) {
                    var curPos = it.getPosition()
                    result[curPos] = curPos
                    ++count
                }
                else break;
            }
        })
        if (count == 5) {
            return { "yaku":Score.Y_5, "positions":result }
        }
        return null
    }
    function is4OneWay(pos, dir) {
        var stone = score.getStone(pos)
        if (stone != BLACK && stone != WHITE) return null
        var enemy = stone == BLACK ? WHITE : BLACK
        var positions5 = []
        var result = {}
        $.each([Iterator.prototype.inc, Iterator.prototype.dec], function(i, mover) {
            var it = score.makeIterator(pos, dir)
            while (true) {
                mover.apply(it)
                var current = it.get()
                if (current == stone) continue
                if (current == null) {
                    it.put(stone)
                    var curPos = it.getPosition()
                    var result5 = is5OneWay(curPos, dir) //isWin(curPos)
                    if (result5 && result5.yaku == Score.Y_5) {
                        positions5.push(curPos)
                        $.each(result5.positions, function(i, v) {
                            result[v] = v
                        })
                        delete result[curPos]
                    }
                    it.put(null)
                    break
                }
                else break
            }
        })
        var count = positions5.length
        if (count == 0) return null
        if (count == 1) {
            return { "yaku":Score.Y_4, "positions":result }
        }
        if (count == 2) {
            var distance = Position.radialDistance(positions5[0], positions5[1])
            if (distance == 5) {
                return { "yaku":Score.Y_4R, "positions":result }
            }
            else {
                return { "yaku":Score.Y_44, "positions":result }
            }
        }
        return null
    }
    function is3OneWay(pos, dir) {
        var stone = score.getStone(pos)
        if (stone != BLACK && stone != WHITE) return null
        var enemy = stone == BLACK ? WHITE : BLACK
        var result = {}
        var detected = false
        $.each([Iterator.prototype.inc, Iterator.prototype.dec], function(i, mover) {
            var it = score.makeIterator(pos, dir)
            while (true) {
                mover.apply(it)
                var current = it.get()
                if (current == stone) continue
                if (current == null) {
                    it.put(stone)
                    var curPos = it.getPosition()
                    var result4 = is4OneWay(curPos, dir)
                    if (result4 && result4.yaku == Score.Y_4R && !isProhibited(curPos)) {
                        detected = true
                        $.each(result4.positions, function(i, v) {
                            result[v] = v
                        })
                        delete result[curPos]
                    }
                    it.put(null)
                    break
                }
                else break
            }
        })
        if (detected) {
            return { "yaku":Score.Y_3, "positions":result }
        }
        else {
            return null
        }
    }
    function rotatePosition(pos, r) {
        switch (r) {
        case 0:
            return new Position(pos.x, pos.y)
        case 1:
            return new Position(pos.y, pos.x)
        case 2:
            return new Position(pos.y, -pos.x)
        case 3:
            return new Position(-pos.x, pos.y)
        case 4:
            return new Position(-pos.x, -pos.y)
        case 5:
            return new Position(-pos.y, -pos.x)
        case 6:
            return new Position(-pos.y, pos.x)
        case 7:
            return new Position(pos.x, -pos.y)
        }
    }
    function normalizePosition(pos, xmin, xmax, ymin, ymax) {
        var xrange = xmax - xmin + 1
        var yrange = ymax - ymin + 1
        var xcenter = Math.floor(xrange / 2)
        var ycenter = Math.floor(yrange / 2)
        var xodd = xrange % 2
        var yodd = yrange % 2

        var x = pos.x
        if (xodd) {
            x -= xmin + xcenter
        }
        else {
            if (x >= xmin + xcenter) {
                x -= xmin + xcenter - 1
            }
            else {
                x -= xmin + xcenter
            }
        }

        var y = pos.y
        if (yodd) {
            y -= ymin + ycenter
        }
        else {
            if (y >= ymin + ycenter) {
                y -= ymin + ycenter - 1
            }
            else {
                y -= ymin + ycenter
            }
        }
        return new Position(x, y)
    }
    function revertNormalizePosition(pos, xmin, xmax, ymin, ymax) {
        var xrange = xmax - xmin + 1
        var yrange = ymax - ymin + 1
        var xcenter = Math.floor(xrange / 2)
        var ycenter = Math.floor(yrange / 2)
        var xodd = xrange % 2
        var yodd = yrange % 2

        var x = pos.x
        if (xodd) {
            x += xmin + xcenter
        }
        else {
            if (x >= 0) {
                x += xmin + xcenter - 1
            }
            else {
                x += xmin + xcenter
            }
        }

        var y = pos.y
        if (yodd) {
            y += ymin + ycenter
        }
        else {
            if (y >= 0) {
                y += ymin + ycenter - 1
            }
            else {
                y += ymin + ycenter
            }
        }
        return new Position(x, y)
    }
    function getSymmetricPositions(pos) {
        var xmin = MAX
        var ymin = MAX
        var xmax = 0
        var ymax = 0
        var result = []
        for (var i = 0; i < score.history.length; ++i) {
            var p = score.history[i]
            if (p.x < xmin) xmin = p.x
            if (p.x > xmax) xmax = p.x
            if (p.y < ymin) ymin = p.y
            if (p.y > ymax) ymax = p.y
        }
        for (var ridx = 1; ridx < 8; ++ridx) {
            var symmetry = true
            for (var i = 0; i < score.history.length; ++i) {
                var p = score.history[i]
                var np = normalizePosition(p, xmin, xmax, ymin, ymax)
                var rp = rotatePosition(np, ridx)
                var rnp = revertNormalizePosition(rp, xmin, xmax, ymin, ymax)
                if (score.getStone(p) != score.getStone(rnp)) {
                    symmetry = false
                    break
                }
            }
            if (symmetry) {
                var np = normalizePosition(pos, xmin, xmax, ymin, ymax)
                var rp = rotatePosition(np, ridx)
                var rnp = revertNormalizePosition(rp, xmin, xmax, ymin, ymax)
                if (!rnp.equals(pos) && score.getStone(rnp) == null) {
                    result.push(rnp)
                }
            }
        }
        return result
    }
    function getKata() {
        var xmin = 4
        var ymin = 4
        var xmax = 10
        var ymax = 10

        if (score.turn != 3) return ""
        if (!score.history[0].equals(new Position(7, 7))) return ""

        var direct = new Position(7, 6)
        var indirect = new Position(8, 6)
        for (var ridx = 0; ridx < 8; ++ridx) {
            var h2_p = score.history[1]

            var h3_p = score.history[2]

            var t2_p = direct
            var t2_np = normalizePosition(t2_p, xmin, xmax, ymin, ymax)
            var t2_rp = rotatePosition(t2_np, ridx)
            var t2_rnp = revertNormalizePosition(t2_rp, xmin, xmax, ymin, ymax)

            if (h2_p.equals(t2_rnp)) {
                var direct3rd = [
                    { "name":"Kansei",    "pos": new Position(7, 5) },
                    { "name":"Keigetsu",  "pos": new Position(8, 5) },
                    { "name":"Sosei",     "pos": new Position(9, 5) },
                    { "name":"Kagetsu",   "pos": new Position(8, 6) },
                    { "name":"Zangetsu",  "pos": new Position(9, 6) },
                    { "name":"Ugetsu",    "pos": new Position(8, 7) },
                    { "name":"Kinsei",    "pos": new Position(9, 7) },
                    { "name":"Shougetsu", "pos": new Position(7, 8) },
                    { "name":"Kyugetsu",  "pos": new Position(8, 8) },
                    { "name":"Shingetsu", "pos": new Position(9, 8) },
                    { "name":"Zuisei",    "pos": new Position(7, 9) },
                    { "name":"Sangetsu",  "pos": new Position(8, 9) },
                    { "name":"Yuusei",    "pos": new Position(9, 9) },
                ]
                for (var i = 0; i < direct3rd.length; ++i) {
                    var t3_p = direct3rd[i].pos
                    var t3_np = normalizePosition(t3_p, xmin, xmax, ymin, ymax)
                    var t3_rp = rotatePosition(t3_np, ridx)
                    var t3_rnp = revertNormalizePosition(t3_rp, xmin, xmax, ymin, ymax)
                    if (h3_p.equals(t3_rnp)) {
                        return direct3rd[i].name
                    }
                }
            }
            else {
                var t2_p = indirect
                var t2_np = normalizePosition(t2_p, xmin, xmax, ymin, ymax)
                var t2_rp = rotatePosition(t2_np, ridx)
                var t2_rnp = revertNormalizePosition(t2_rp, xmin, xmax, ymin, ymax)
                if (h2_p.equals(t2_rnp)) {
                    var indirect3rd = [
                        { "name":"Chousei",   "pos": new Position(9, 5) },
                        { "name":"Kyougetsu", "pos": new Position(9, 6) },
                        { "name":"Kousei",    "pos": new Position(9, 7) },
                        { "name":"Suigetsu",  "pos": new Position(9, 8) },
                        { "name":"Ryusei",    "pos": new Position(9, 9) },
                        { "name":"Ungetsu",   "pos": new Position(8, 7) },
                        { "name":"Hogetsu",   "pos": new Position(8, 8) },
                        { "name":"Rangetsu",  "pos": new Position(8, 9) },
                        { "name":"Gingetsu",  "pos": new Position(7, 8) },
                        { "name":"Myoujyou",  "pos": new Position(7, 9) },
                        { "name":"Shagetsu",  "pos": new Position(6, 8) },
                        { "name":"Meigetsu",  "pos": new Position(6, 9) },
                        { "name":"Suisei",    "pos": new Position(5, 9) },
                    ]
                    for (var i = 0; i < indirect3rd.length; ++i) {
                        var t3_p = indirect3rd[i].pos
                        var t3_np = normalizePosition(t3_p, xmin, xmax, ymin, ymax)
                        var t3_rp = rotatePosition(t3_np, ridx)
                        var t3_rnp = revertNormalizePosition(t3_rp, xmin, xmax, ymin, ymax)
                        if (h3_p.equals(t3_rnp)) {
                            return indirect3rd[i].name
                        }
                    }
                }
            }
        }
        return ""
    }
})
