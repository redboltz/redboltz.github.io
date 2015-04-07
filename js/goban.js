const WS_URL = "ws://www.redboltz.net:10080"
const BLACK  = "BLACK"
const WHITE  = "WHITE"
const BORDER = "BORDER"
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
Score.Y_PROHIBITED = "PROHIBITED"
Score.Y_WIN        = "Y_WIN"
Score.Y_6          = "Y_6"
Score.Y_5          = "Y_5"
Score.Y_4          = "Y_4"
Score.Y_4R         = "Y_4R"
Score.Y_44         = "Y_44"
Score.Y_43         = "Y_43"
Score.Y_33         = "Y_33"
Score.Y_3          = "Y_3"
Score.Y_NONE       = "Y_NONE"

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
Iterator.DIR_LR = { "name":"DIR_LR", "move":{x:1, y:0} }
Iterator.DIR_UD = { "name":"DIR_UD", "move":{x:0, y:1} }
Iterator.DIR_LU = { "name":"DIR_LU", "move":{x:1, y:-1} }
Iterator.DIR_LD = { "name":"DIR_LD", "move":{x:1, y:1} }

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

$(window).on('load', function() {
    const STONE_SIZE    = 15
    const BASE          = 32
    const CANVAS_WIDTH  = BASE * (MAX + 1)
    const CANVAS_HEIGHT = BASE * (MAX + 1)

    const PING           =  0
    const START_REQ      =  1
    const START_ACCEPT   =  2
    const T_BLACK_START  =  3
    const T_WHITE_START  =  4
    const T_FIRST        =  5
    const T_SECOND       =  6
    const T_THIRD        =  7
    const SWAP           =  8
    const MOVE           =  9
    const FIFTH_STONE1   = 10
    const FIFTH_STONE2   = 11
    const FIFTH_CHOICE   = 12
    const PASS           = 13
    const RESIGN         = 14
    const DRAW_REQ       = 15
    const DRAW_ACCEPT    = 16
    const DRAW_REJECT    = 17

    var score = {}
    var goban      = document.getElementById('goban')
    var stone      = document.getElementById('stone')
    var number     = document.getElementById('number')
    var focus      = document.getElementById('focus')
    var yaku       = document.getElementById('yaku')
    var guide      = document.getElementById('guide')
    var altStone   = document.getElementById('alt_stone')
    var touch      = document.getElementById('touch')
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
    var ctxTouch    = touch.getContext('2d')
    var scoreView = document.getElementById("scoreView")

    const COM   = "COM"
    const HUMAN = "HUMAN"
    const NET_COM   = "NET_COM"
    const NET_HUMAN = "NET_HUMAN"
    const NET_WAITING = "NET_WAITING"

    var blackPlayer = HUMAN
    var whitePlayer = HUMAN

    var playing = false
    var openingMove = 0
    var yakuPositions
    var alt5first = null
    var alt5second = null
    var symPos = []

    var waitSwapOrNot = false

    var ws = null

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
        else if (id == "Network") {
            blackPlayer = NET_WAITING
            whitePlayer = NET_WAITING
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

    function doFirstMove() {
        waitSwapOrNot = false
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
        var a = msgpack.pack(MOVE)
        a = a.concat(msgpack.pack([pos.x, pos.y]))
        var b = new Uint8Array(a)
        ws.send(b)
    }

    function startGame() {
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
            doFirstMove()
        }
        else if (blackPlayer == NET_WAITING) {
            var id = getParameterByName("id")
            if (id == "") {
                var query = ""
                if (altMove.checked) {
                    query = "?altmove=true"
                }
                else {
                    query = "?altmove=false"
                }
                ws = new WebSocket(WS_URL + "/" + query)
            }
            ws.binaryType = 'arraybuffer'
            ws.onopen = wsOnOpen
            ws.onclose = wsOnClose
            ws.onerror = wsOnError
            ws.onmessage = wsOnMessage
            // Web Socket is connected, send data using send()
        }
    }

    var id = getParameterByName("id")
    if (id != "") {
        $(gameType).prop("selectedIndex", 1)
        blackPlayer = NET_WAITING
        whitePlayer = NET_WAITING
        ws = new WebSocket(WS_URL+"?id=" + id)
        startGame()
    }

    // Start click
    $(start).on('click', function() {
        startGame()
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

    function update(pos) {
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
                    if (whitePlayer == NET_HUMAN) {
                        var a = msgpack.pack(MOVE)
                        a = a.concat(msgpack.pack([pos.x, pos.y]))
                        var b = new Uint8Array(a)
                        ws.send(b)
                    }
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
                    if (whitePlayer == NET_HUMAN) {
                        var a = msgpack.pack(MOVE)
                        a = a.concat(msgpack.pack([pos.x, pos.y]))
                        var b = new Uint8Array(a)
                        ws.send(b)
                    }
                    return
                }
                if (pos.equals(alt5first)) {
                    clearStone(ctxStone, alt5second)
                    clearNumber(ctxNumber, alt5first)
                    clearNumber(ctxNumber, alt5second)
                    pos = alt5first
                    if (blackPlayer == NET_HUMAN) {
                        var a = msgpack.pack(MOVE)
                        a = a.concat(msgpack.pack([pos.x, pos.y]))
                        var b = new Uint8Array(a)
                        ws.send(b)
                    }
                }
                else if (pos.equals(alt5second)) {
                    clearStone(ctxStone, alt5first)
                    clearNumber(ctxNumber, alt5first)
                    clearNumber(ctxNumber, alt5second)
                    pos = alt5second
                    if (blackPlayer == NET_HUMAN) {
                        var a = msgpack.pack(MOVE)
                        a = a.concat(msgpack.pack([pos.x, pos.y]))
                        var b = new Uint8Array(a)
                        ws.send(b)
                    }
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

        var send = false
        if (altMove.checked) {
            if (score.turn < 3) {
                if (whitePlayer == NET_HUMAN) {
                    send = true
                }
            }
            else if (score.turn == 3 && blackPlayer == NET_HUMAN) {
                waitSwapOrNot = true
                $.toast({
                    text: "Which color do you want to play?<br />" + '<input type="button" name="black" id="black" value="Black">    <input type="button" name="white" id="white" value="White">',
                    hideAfter: false,
                    position: 'bottom-center'
                })
                $("#black").on('click', function () {
                    blackPlayer = [whitePlayer, whitePlayer = blackPlayer][0]
                    var a = msgpack.pack(SWAP)
                    var b = new Uint8Array(a)
                    ws.send(b)
                    $.toast().reset('all')
                    waitSwapOrNot = false
                })
                $("#white").on('click', function () {
                    $.toast().reset('all')
                    waitSwapOrNot = false
                })
            }
            else {
                if ((score.move == BLACK && blackPlayer == NET_HUMAN) ||
                    (score.move == WHITE && whitePlayer == NET_HUMAN)) {
                    send = true
                }
            }
        }
        else {
            if ((score.move == BLACK && blackPlayer == NET_HUMAN) ||
                (score.move == WHITE && whitePlayer == NET_HUMAN)) {
                send = true
            }
        }
        if (send) {
            // Send data to network player
            var a = msgpack.pack(MOVE)
            a = a.concat(msgpack.pack([pos.x, pos.y]))
            var b = new Uint8Array(a)
            ws.send(b)
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
    }

    // Board click
    $(input).on('mousedown', function(e) {
        if (!playing) return
        if (waitSwapOrNot) return
        if (altMove.checked) {
            if (score.turn < 3) {
                if (blackPlayer != HUMAN) return
            }
            else if (score.turn == 4) {
                if (alt5first == null || alt5second == null) {
                    if (blackPlayer != HUMAN) return
                }
                else {
                    if (whitePlayer != HUMAN) return
                }
            }
            else {
                if (score.move == BLACK && blackPlayer != HUMAN) return
                if (score.move == WHITE && whitePlayer != HUMAN) return
            }
        }
        else {
            if (score.move == BLACK && blackPlayer != HUMAN) return
            if (score.move == WHITE && whitePlayer != HUMAN) return
        }
        var pos = adjustXY(e)
        update(pos)
    })

    var touchGuideExists = false
    $(input).bind('touchstart', function(e) {
        if (!playing) return
        drawTouchGuide(ctxTouch, adjustXY(e.originalEvent.touches[0]))
        touchGuideExists = true
    })
    $(input).bind('touchmove', function(e) {
        if (!touchGuideExists) return
        drawTouchGuide(ctxTouch, adjustXY(e.originalEvent.touches[0]))
        touchGuideExists = false
    })
    $(input).bind('touchend', function(e) {
        if (!touchGuideExists) return
        clearTouchGuide(ctxTouch)
        touchGuideExists = false
    })
    function pingHandler() {
        if (ws) {
            var a = msgpack.pack(PING)
            var b = new Uint8Array(a)
            ws.send(b)
        }
    }
    var pingId = null
    function setTimer() {
        if (ws) {
            pingId = setInterval(pingHandler, 30000)
        }
    }
    function resetTimer() {
        clearInterval(pingId)
        setTimer()
    }
    function wsOnOpen(e) {
        setTimer()
    }
    function wsOnClose(e) {
        ws = null
    }
    function wsOnError(e) {
        ws = null
    }
    function wsOnMessage(e) {
        if (e && e.data) {
            var data = new Uint8Array(e.data)
            var cmd = msgpack.unpack(data)
            switch (cmd) {
            case START_ACCEPT:
                data = data.subarray(msgpack.unpackedLength())
                var id = msgpack.unpack(data)
                var url = window.location.protocol + "//" + window.location.host
                if (window.location.pathname != "") {
                    url += window.location.pathname
                }
                url += "?id=" + id
                $.toast({
                    text: "Send the following URL to your oppornent.<br />" + url,
                    hideAfter: false,
                    position: 'bottom-center'
                })
                break
            case T_BLACK_START:
                blackPlayer = HUMAN
                whitePlayer = NET_HUMAN
                data = data.subarray(msgpack.unpackedLength())
                if (msgpack.unpack(data)) {
                    altMove.checked = true
                    $.toast({
                        text: "You are a tentative black player.",
                        hideAfter: false,
                        position: 'bottom-center'
                    })
                }
                else {
                    altMove.checked = false
                    $.toast({
                        text: "You are a black player.",
                        hideAfter: false,
                        position: 'bottom-center'
                    })
                }
                doFirstMove()
                break
            case T_WHITE_START:
                blackPlayer = NET_HUMAN
                whitePlayer = HUMAN
                data = data.subarray(msgpack.unpackedLength())
                if (msgpack.unpack(data)) {
                    altMove.checked = true
                    $.toast({
                        text: "You are a tentative white player.",
                        hideAfter: false,
                        position: 'bottom-center'
                    })
                }
                else {
                    altMove.checked = false
                    $.toast({
                        text: "You are a white player.",
                        hideAfter: false,
                        position: 'bottom-center'
                    })
                }
                break
            case MOVE:
                var len = msgpack.unpackedLength()
                data = data.subarray(len)
                var upd = msgpack.unpack(data)
                pos = new Position(upd[0], upd[1])
                update(pos)
                break
            case SWAP:
                blackPlayer = [whitePlayer, whitePlayer = blackPlayer][0]
                $.toast({
                    text: "Your oppornent choose swap black and white. Then you are white.",
                    hideAfter: false,
                    position: 'bottom-center'
                })
                break
            }
        }
    }

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
    function drawTouchGuide(ctx, pos) {
        ctx.beginPath()
        ctx.lineWidth = 3
        ctx.strokeStyle = "#FF0066"
        ctx.arc(
            (pos.x + 1) * BASE,
            (pos.y + 1) * BASE,
            BASE,
            0,
            Math.PI * 2,
            false)
        ctx.stroke()
    }
    function clearTouchGuide(ctx) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
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
    function isProhibited(pos, dir) {
        var stone = score.getStone(pos)
        if (stone != BLACK) return false
        var ret = checkYakuWithoutDir(pos, dir)
        if (ret.yaku == Score.Y_6 || ret.yaku == Score.Y_44 || ret.yaku == Score.Y_33) return true
        return false
    }

    function checkYaku(pos) {
        return checkYakuWithoutDir(pos, null)
    }

    function checkYakuWithoutDir(pos, dir) {
        var dirs = {}
        dirs[Iterator.DIR_LR.name] = Iterator.DIR_LR
        dirs[Iterator.DIR_UD.name] = Iterator.DIR_UD
        dirs[Iterator.DIR_LU.name] = Iterator.DIR_LU
        dirs[Iterator.DIR_LD.name] = Iterator.DIR_LD
        if (dir) delete dirs[dir.name]

        var stone = score.getStone(pos)
        var ys = []
        for (var d in dirs) {
            ys.push(checkOneWay(pos, dirs[d]))
        }
        var count = {}
        for (var y in ys) {
            var yaku = ys[y]
            if (count[yaku.yaku] == null) count[yaku.yaku] = 1
            else ++count[yaku.yaku]
        }
        if (count[Score.Y_5] > 0) {
            for (var y in ys) {
                var yaku = ys[y]
                if (yaku.yaku == Score.Y_5) {
                    return { "yaku":Score.Y_WIN, "positions":yaku.positions }
                }
            }
        }
        if (count[Score.Y_6] > 0) {
            for (var y in ys) {
                var yaku = ys[y]
                if (yaku.yaku == Score.Y_6) {
                    if (stone == WHITE) return { "yaku":Score.Y_WIN, "positions":yaku.positions }
                    return yaku
                }
            }
        }

        var cy4 = count[Score.Y_4]
        var cy44 = count[Score.Y_44]
        var cy4r = count[Score.Y_4R]
        var cy3 = count[Score.Y_3]

        if (cy4 + cy4r + cy44 >= 2) {
            var positions = {}
            for (var y in ys) {
                var yaku = ys[y]
                if (yaku.yaku == Score.Y_4 || yaku.yaku == Score.Y_44 || yaku.yaku == Score.Y_4R) {
                    $.each(yaku.positions, function(i, v){
                        positions[v] = v
                    })
                }
            }
            return { "yaku":Score.Y_44, "positions":positions }
        }
        if (cy44 > 0) {
            for (var y in ys) {
                var yaku = ys[y]
                if (yaku.yaku == Score.Y_44) return yaku
            }
        }

        if (stone == BLACK) {
            if (cy3 >= 2) {
                var positions = {}
                for (var y in ys) {
                    var yaku = ys[y]
                    if (yaku.yaku == Score.Y_3) {
                        $.each(yaku.positions, function(i, v){
                            positions[v] = v
                        })
                    }
                }
                return { "yaku":Score.Y_33, "positions":positions }
            }
        }

        if (cy4r > 0) {
            for (var y in ys) {
                var yaku = ys[y]
                if (yaku.yaku == Score.Y_4R) return yaku
            }
        }

        if (cy4 + cy3 >= 2) {
            var positions = {}
            for (var y in ys) {
                var yaku = ys[y]
                if (yaku.yaku == Score.Y_4 || yaku.yaku == Score.Y_3) {
                    $.each(yaku.positions, function(i, v){
                        positions[v] = v
                    })
                }
            }
            return { "yaku":Score.Y_43, "positions":positions }
        }

        if (stone == WHITE) {
            if (cy3 >= 2) {
                var positions = {}
                for (var y in ys) {
                    var yaku = ys[y]
                    if (yaku.yaku == Score.Y_3) {
                        $.each(yaku.positions, function(i, v){
                            positions[v] = v
                        })
                    }
                }
                return { "yaku":Score.Y_33, "positions":positions }
            }
        }

        if (cy4 > 0) {
            for (var y in ys) {
                var yaku = ys[y]
                if (yaku.yaku == Score.Y_4) return yaku
            }
        }

        if (cy3 > 0) {
            for (var y in ys) {
                var yaku = ys[y]
                if (yaku.yaku == Score.Y_3) return yaku
            }
        }
        return { "yaku":Score.Y_NONE, "positions": {} }
    }

    function checkOneWay(pos, dir) {
        return checkOneWayWithDepth(pos, dir, 0, 3)
    }
    function checkOneWayWithDepth(pos, dir, depth, depthMax) {
        if (depth == depthMax) return { "yaku":Score.Y_NONE, "positions":{} }
        var stone = score.getStone(pos)
        if (stone != BLACK && stone != WHITE) return { "yaku":Score.Y_NONE, "positions":{} }
        var count = 0
        var result = {}
        var edge = []
        result[pos] = pos
        ++count
        $.each([Iterator.prototype.inc, Iterator.prototype.dec], function(i, mover) {
            var it = score.makeIterator(pos, dir.move)
            while (true) {
                mover.apply(it)
                var current = it.get()
                if (current == stone) {
                    var curPos = it.getPosition()
                    result[curPos] = curPos
                    ++count
                }
                else if (current == null) {
                    var curPos = it.getPosition()
                    edge.push(it)
                    break
                }
                else break
            }
        })
        if (count >= 6) {
            return { "yaku":Score.Y_6, "positions":result }
        }
        else if (count == 5) {
            return { "yaku":Score.Y_5, "positions":result }
        }
        else {
            var result = {}
            var posWin = []
            var detect3 = false
            for (var it in edge) {
                it = edge[it]
                it.put(stone)
                var curPos = it.getPosition()
                var ret = checkOneWayWithDepth(curPos, dir, depth+1, depthMax)
                if (ret.yaku == Score.Y_5 || (stone == WHITE && ret.yaku == Score.Y_6)) {
                    if (detect3) result = {}
                    $.each(ret.positions, function(i, v) {
                        result[v] = v
                    })
                    posWin.push(curPos)
                }
                else if (ret.yaku == Score.Y_4R && !isProhibited(curPos, dir) && posWin.length == 0) {
                    $.each(ret.positions, function(i, v) {
                        result[v] = v
                    })
                    detect3 = true
                }
                delete result[curPos]
                it.put(null)
            }
            var posWinLen = posWin.length
            if (posWinLen == 1) {
                return { "yaku":Score.Y_4, "positions":result }
            }
            else if (posWinLen == 2) {
                var distance = Position.radialDistance(posWin[0], posWin[1])
                if (distance == 5) {
                    return { "yaku":Score.Y_4R, "positions":result }
                }
                else {
                    return { "yaku":Score.Y_44, "positions":result }
                }
            }
            else if (detect3) {
                return { "yaku":Score.Y_3, "positions":result }
            }
            return { "yaku":Score.Y_NONE, "positions":{} }
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
