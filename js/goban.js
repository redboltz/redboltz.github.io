const WS_URL = "wss://www.redboltz.net:10080"
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
    const NEW_ID         =  1
    const START_REQ      =  2
    const START_RET      =  3
    const T_BLACK_START  =  4
    const T_WHITE_START  =  5
    const T_FIRST        =  6
    const T_SECOND       =  7
    const T_THIRD        =  8
    const SWAP           =  9
    const MOVE           = 10
    const FIFTH_STONE1   = 11
    const FIFTH_STONE2   = 12
    const FIFTH_CHOICE   = 13
    const PASS           = 14
    const RESIGN         = 15
    const DRAW_REQ       = 16
    const DRAW_ACCEPT    = 17
    const DRAW_REJECT    = 18

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
    var draw       = document.getElementById('draw')
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

    var baseUrl = null

    var swapped = false
    var blockDialog = false

    var lang = (window.navigator.userLanguage || window.navigator.language || window.navigator.browserLanguage).substr(0,2) == "ja" ? "ja" : "en"

    if (lang == "ja") {
        $("#start").val("開始")
        $("#pass").val("パス")
        $("#resign").val("投了")
        $("#draw").val("引き分け提案")
        $("#BHvWH").text("先手（人間）vs後手（人間）")
        $("#Network").text("人とネット対戦")
        $("#BHvWC").text("先手（人間）vs後手（COM）")
        $("#BCvWH").text("先手（COM）vs後手（人間）")
        $("#text_alt_move").text("連珠ルール")
        $("#text_show_number").text("石の上に数字表示")
        $("#text_show_yaku").text("三などを表示")
    }

    var baseUrl = window.location.protocol + "//" + window.location.host
    if (window.location.pathname != "") {
        baseUrl += window.location.pathname
    }

    drawBoard(goban.getContext('2d'))

    $(pass).prop('disabled', true)
    $(resign).prop('disabled', true)
    $(draw).prop('disabled', true)

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
        var scoreText = sprintf("%3d: %s: %s", 1, lang == "ja" ? "黒" : "Black", pos.toString())
        var $pre = $('<pre>').text(scoreText)
        var $newLi = $('<li>').append($pre).appendTo(scoreView)
        moveFocus($newLi)
        $(scoreView).parent().scrollTop($(scoreView)[0].scrollHeight)
        if (ws) {
            var a = msgpack.pack(MOVE)
            a = a.concat(msgpack.pack([pos.x, pos.y]))
            var b = new Uint8Array(a)
            ws.send(b)
        }
    }

    function startGame() {
        playing = true
        swapped = false
        alt5first = null
        alt5second = null
        blockDialog = false

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
            if (altMove.checked) {
                if (whitePlayer == HUMAN) {
                    guideToast(lang == "ja" ? '青い四角の中に白を打ってください<br />スマホで石を打つには、画面を長押しして<br />十字カーソルの位置を合わせ指を離します<br />OKをクリックしなくても石を打てば<br />このメッセージは消えます' : "Place a white stone in the blue rect.<br />When you use a smart phone, long press on the board, then adjust a cross cursour, and then release.<br />You don't need to tap OK button. This dialog is automatically closed when you place a stone.")
                }
                draw2ndGuide(ctxGuide)
            }
            else {
                guideToast(lang == "ja" ? '白を打ってください<br />スマホで石を打つには、画面を長押しして<br />十字カーソルの位置を合わせ指を離します<br />OKをクリックしなくても石を打てば<br />このメッセージは消えます' : "Place a white stone.<br />When you use a smart phone, long press on the board, then adjust a cross cursour, and then release.<br />You don't need to tap OK button. This dialog is automatically closed when you place a stone.")
                clearGuide(ctxGuide)
            }
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
                if (!ws) {
                    ws = new WebSocket(WS_URL + "/" + query)
                    ws.binaryType = 'arraybuffer'
                    ws.onopen = wsOnOpen
                    ws.onclose = wsOnClose
                    ws.onerror = wsOnError
                    ws.onmessage = wsOnMessage
                }
            }
        }
    }
    var id = getParameterByName("id")
    if (id != "") {
        $(gameType).prop("selectedIndex", 1)
        blackPlayer = NET_WAITING
        whitePlayer = NET_WAITING
        if (!ws) {
            ws = new WebSocket(WS_URL+"?id=" + id)
            ws.binaryType = 'arraybuffer'
            ws.onopen = wsOnOpen
            ws.onclose = wsOnClose
            ws.onerror = wsOnError
            ws.onmessage = wsOnMessage
        }
        startGame()
    }

    // Start click
    $(start).on('click', function() {
        $.toast().reset('all')
        if ((blackPlayer == HUMAN && whitePlayer == NET_HUMAN) ||
            (blackPlayer == NET_HUMAN && whitePlayer == HUMAN)) {
            var id = getParameterByName("id")
            var a = msgpack.pack(START_REQ)
            a = a.concat(msgpack.pack(altMove.checked))
            var b = new Uint8Array(a)
            ws.send(b)
        }
        else {
            startGame()
        }
    })

    // Resign click
    $(resign).on('click', function() {
        playing = false
        $(resign).prop('disabled', true)
        $(gameType).prop('disabled', false)
        $(altMove).prop('disabled', false)
        guideToast(lang == "ja" ? '投了しました' : 'You resigned.')
        if (ws) {
            var a = msgpack.pack(RESIGN)
            a = a.concat(msgpack.pack(altMove.checked))
            var b = new Uint8Array(a)
            ws.send(b)
        }
    })

    // Draw click
    $(draw).on('click', function() {
        if (ws) {
            var a = msgpack.pack(DRAW_REQ)
            var b = new Uint8Array(a)
            ws.send(b)
            guideToast(lang == "ja" ? '引き分けの提案を行いました<br />返事をお待ちください' : 'Send a draw request.<br />Please wait the responce.')
            blockDialog = true
        }
    })

    // Pass click
    $(pass).on('click', function() {
        score.pass()
        guideToast(lang == "ja" ? 'パスしました' : 'You passed.')
        if (ws) {
            var a = msgpack.pack(PASS)
            var b = new Uint8Array(a)
            ws.send(b)
        }
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
                if (blackPlayer == HUMAN) {
                    guideToast(lang == "ja" ? '青い四角の中に黒を打ってください' : 'Place a black stone in the blue rect.')
                    draw3rdGuide(ctxGuide)
                }
            }
            else if (score.turn == 2) {
                if (pos.x < 5 || pos.x > 9 || pos.y < 5 || pos.y > 9) return
                clearGuide(ctxGuide)
                if (blackPlayer == HUMAN) {
                    if (whitePlayer == HUMAN) {
                        guideToast(lang == "ja" ? '仮後は黒か白を宣言してください。<br />白になった人は白を打ってください' : 'Tentative white player choose black or white.<br />Then white player put a white stone.')
                    }
                    else if (whitePlayer == NET_HUMAN) {
                        guideToast(lang == "ja" ? '仮後は黒か白を選んでいます<br />お待ちください' : 'Tentative white player is choosing black or white.<br />Wait a moment.')
                        blockDialog = true
                    }
                }
            }
            else if (score.turn == 3) {
                $.toast().reset('all')
                if (blackPlayer == HUMAN) {
                    guideToast(lang == "ja" ? '黒を2個打ってください<br />その後、後手はどちらかを取り除きます' : 'Place two black stones.<br />Then white player will remove one.')
                }
            }
            else if (score.turn == 4) {
                if (alt5first == null) {
                    alt5first = pos
                    putStoneDirect(ctxStone, pos, BLACK)
                    putNumberWithColor(ctxAltStone, pos, "5A", "#00FF00")
                    symPos = getSymmetricPositions(pos)
                    for (var i = 0; i < symPos.length; ++i) {
                        putNumberWithColor(ctxAltStone, symPos[i], "NG", "#FF1111")
                    }
                    if (whitePlayer == NET_HUMAN) {
                        var a = msgpack.pack(MOVE)
                        a = a.concat(msgpack.pack([pos.x, pos.y]))
                        var b = new Uint8Array(a)
                        ws.send(b)
                    }
                    if (blackPlayer == HUMAN) {
                        guideToast(lang == "ja" ? 'もう一つ黒を打ってください<br />その後、後手はどちらかを取り除きます' : 'Place one more black stone.<br />Then white player will remove one.')
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
                    if (whitePlayer == NET_HUMAN) {
                        var a = msgpack.pack(MOVE)
                        a = a.concat(msgpack.pack([pos.x, pos.y]))
                        var b = new Uint8Array(a)
                        ws.send(b)
                    }
                    if (blackPlayer == HUMAN) {
                        guideToast(lang == "ja" ? '後手が石を一つ取り除くのを待ってください' : 'Wait the stone is removed by the white player.')
                    }
                    if (whitePlayer == HUMAN) {
                        guideToast(lang == "ja" ? '5A,5Bのうち、残したい石を選んでください' : 'Select the stone you want to leave.<br />Then put white stone.')
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
                    if (whitePlayer == HUMAN) {
                        guideToast(lang == "ja" ? '白を打ってください' : 'Place a white stone.')
                    }
                    if (blackPlayer == HUMAN && whitePlayer == NET_HUMAN) {
                        guideToast(lang == "ja" ? '相手が白を打つのを待ってください' : "Wait a white player's move.")
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
                    if (whitePlayer == HUMAN) {
                        guideToast(lang == "ja" ? '白を打ってください' : 'Place a white stone.')
                    }
                    if (blackPlayer == HUMAN && whitePlayer == NET_HUMAN) {
                        guideToast(lang == "ja" ? '相手が白を打つのを待ってください' : "Wait a white player's move.")
                    }
                }
                else {
                    return
                }
                ctxAltStone.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
            }
            else if (score.turn == 5) {
                $.toast().reset('all')
                $(draw).prop('disabled', false)
            }
        }
        else {
            if (score.turn == 1) {
                $(draw).prop('disabled', false)
                if (whitePlayer == HUMAN) {
                    $.toast().reset('all')
                }
            }
            else if (score.turn == 2) {
                if (blackPlayer == HUMAN) {
                    $.toast().reset('all')
                }
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
                    text: lang == "ja" ? 'これ以降、黒と白どちらで指しますか？<br /><input type="button" name="black" id="black" value="　黒　">    <input type="button" name="white" id="white" value="　白　">' : 'Which color do you want to play?<br /><input type="button" name="black" id="black" value="Black">    <input type="button" name="white" id="white" value="White">',
                    hideAfter: false,
                    stack: false,
                    position: { left : 100, right : 'auto', top : 100, bottom : 'auto' }

                })
                $("#black").on('click', function () {
                    blackPlayer = [whitePlayer, whitePlayer = blackPlayer][0]
                    swapped = true
                    var a = msgpack.pack(SWAP)
                    a = a.concat(swapped)
                    var b = new Uint8Array(a)
                    ws.send(b)
                    waitSwapOrNot = false
                    guideToast(lang == "ja" ? '黒を選択しました<br / >相手が白を打つのをお待ちください' : "You decided that you are a black player.<br />Wait a white player's move.")
                    blockDialog = false
                })
                $("#white").on('click', function () {
                    var a = msgpack.pack(SWAP)
                    a = a.concat(swapped)
                    var b = new Uint8Array(a)
                    ws.send(b)
                    waitSwapOrNot = false
                    guideToast(lang == "ja" ? '白を選択しました<br />白を打ってください' : 'You decided that you are a white player.<br />Place a white stone.')
                    blockDialog = false
                })
                blockDialog = true
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
        var stoneString = stone == BLACK ? lang == "ja" ? "黒" : "Black" : lang == "ja" ? "白" : "White"
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
                    guideToast(lang == "ja" ? '黒の勝ちです' : 'Black Win!')
                }
                else if (stone == WHITE) {
                    guideToast(lang == "ja" ? '白の勝ちです' : 'White Win!')
                }
                playing = false
                $(gameType).prop('disabled', false)
                $(altMove).prop('disabled', false)
                $(pass).prop('disabled', true)
                $(resign).prop('disabled', true)
                $(draw).prop('disabled', true)
            }
            else if (stone == BLACK && (result.yaku == Score.Y_6 || result.yaku == Score.Y_44 || result.yaku == Score.Y_33)) {
                guideToast(lang == "ja" ? '白の勝ちです<br />黒は禁じ手を指しました' : 'White Win! Because black move is prohibited.')
                playing = false
                $(gameType).prop('disabled', false)
                $(altMove).prop('disabled', false)
                $(pass).prop('disabled', true)
                $(resign).prop('disabled', true)
                $(draw).prop('disabled', true)
            }

        }
    }

    function restartGame() {
        if (swapped == false) {
            blackPlayer = [whitePlayer, whitePlayer = blackPlayer][0]
        }
        if (blackPlayer == HUMAN) {
            if (altMove.checked) {
                guideToast(lang == "ja" ? 'あなたは仮先です<br />白を青い四角の中に打ってください<br />スマホで石を打つには、画面を長押しして<br />十字カーソルの位置を合わせ指を離します<br />OKをクリックしなくても石を打てば<br />このメッセージは消えます' : 'You are a tentative black player.<br />Place a white stone in the blue rect.')
                draw2ndGuide(ctxGuide)
            }
            else {
                guideToast(lang == "ja" ? 'あなたは黒です<br />OKをクリックしなくても石を打てばこのメッセージは消えます' : 'You are a black player.')
            }
        }
        else if (whitePlayer == HUMAN) {
            if (altMove.checked) {
                guideToast(lang == "ja" ? 'あなたは仮後です<br />仮先が3つ石を打つまで待ってください<br />OKをクリックしなくても石を打てば<br />このメッセージは消えます' : 'You are a tentative white player.<br />Wait 3 stone will be put by tentative black player.')
            }
            else {
                guideToast(lang == "ja" ? 'あなたは白です<br />白を打ってください<br />スマホで石を打つには、画面を長押しして<br />十字カーソルの位置を合わせ指を離します<br />OKをクリックしなくても石を打てば<br />このメッセージは消えます' : 'You are a white player.')
            }
            clearGuide(ctxGuide)
        }
        startGame()
    }

    var disableClick = false

    function humanInput(pos) {
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
        update(pos)
    }
    // Board click
    $(input).on('mousedown', function(e) {
        if (disableClick) return
        var pos = adjustXY(e)
        humanInput(pos)
    })

    var touchId = null
    var touchCancelId = null
    var touchMode = false
    var touchPos = null
    var lastTouchPos = null

    $(input).bind('touchstart', function(e) {
        if (!playing) return
        disableClick = true
        if (e.originalEvent.touches.length != 1) return
        touchId = setTimeout(
            function() {
                touchPos = adjustXY(e.originalEvent.touches[0])
                lastTouchPos = touchPos
                drawTouchGuide(ctxTouch, touchPos)
                e.preventDefault()
                touchMode = true
                touchId = null
                touchCancelId = setTimeout(
                    function() {
                        if (blockDialog == false) {
                            guideToast(lang == "ja" ? 'マルチタップあるいは石の上で指を離せばキャンセルできます' : 'You can cancel this move using double tap or release your finger on a stone.')
                            touchCancelId = null
                        }
                    },
                    2000)
            },
            100)
    })
    $(input).bind('touchmove', function(e) {
        if (touchId) {
            clearInterval(touchId)
            touchId = setTimeout(
                function() {
                    touchPos = adjustXY(e.originalEvent.touches[0])
                    lastTouchPos = touchPos
                    drawTouchGuide(ctxTouch, touchPos)
                    e.preventDefault()
                    touchMode = true
                    touchId = null
                },
                500)
        }
        if (touchMode) {
            if (e.originalEvent.touches.length != 1) {
                clearTouchGuide(ctxTouch)
                touchMode = false
                return
            }
            e.preventDefault()
            touchPos = adjustXY(e.originalEvent.touches[0])
            if (!touchPos.equals(lastTouchPos)) {
                lastTouchPos = touchPos
                clearTouchGuide(ctxTouch)
                drawTouchGuide(ctxTouch, touchPos)
            }
        }
    })
    $(input).bind('touchend', function(e) {
        if (blockDialog == false) {
            $.toast().reset('all')
        }
        clearTouchGuide(ctxTouch)
        if (touchId) {
            clearInterval(touchId)
            touchId = null
        }
        if (touchCancelId) {
            clearInterval(touchCancelId)
            touchCancelId = null
        }
        if (touchMode) {
            e.preventDefault()
            touchMode = false
            humanInput(touchPos)
        }
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
            case NEW_ID:
                data = data.subarray(msgpack.unpackedLength())
                var id = msgpack.unpack(data)
                var url = baseUrl
                url += "?id=" + id
                guideToast(lang == "ja" ? '対戦相手にアドレスバーのURLを送ってください' : 'Send the URL at the address bar to your oppornent.')
                history.pushState(null, null, url)
                break
            case START_REQ:
                $.toast({
                    text: lang == "ja" ? '対戦相手が再戦を要求しています<br />受けますか？<br /><input type="button" name="yes" id="yes" value="はい">    <input type="button" name="no" id="no" value="いいえ">' : 'Your oppornent is requesting replay. Accept?<br /><input type="button" name="yes" id="yes" value="Yes">    <input type="button" name="no" id="no" value="No">',
                    hideAfter: false,
                    stack: false,
                    position: { left : 100, right : 'auto', top : 100, bottom : 'auto' }
                })
                $("#yes").on('click', function () {
                    data = data.subarray(msgpack.unpackedLength())
                    altMove.checked = msgpack.unpack(data)

                    var a = msgpack.pack(START_RET)
                    a = a.concat(msgpack.pack(true))
                    var b = new Uint8Array(a)
                    ws.send(b)
                    $.toast().reset('all')
                    restartGame()
                })
                $("#no").on('click', function () {
                    var a = msgpack.pack(START_RET)
                    a = a.concat(msgpack.pack(false))
                    var b = new Uint8Array(a)
                    ws.send(b)
                    $.toast().reset('all')
                    blockDialog = false
                })
                blockDialog = true
                break
            case START_RET:
                data = data.subarray(msgpack.unpackedLength())
                var status = msgpack.unpack(data)
                if (status == true) {
                    restartGame()
                }
                else {
                    guideToast(lang == "ja" ? '相手は再戦を受け入れませんでした' : 'Your oppornent rejected your request.')
                    blockDialog = false
                }
                break
            case T_BLACK_START:
                if (blackPlayer == NET_WAITING || whitePlayer == NET_WAITING) {
                    history.pushState(null, null, baseUrl)
                    blackPlayer = HUMAN
                    whitePlayer = NET_HUMAN
                    data = data.subarray(msgpack.unpackedLength())
                    if (msgpack.unpack(data)) {
                        altMove.checked = true
                        guideToast(lang == "ja" ? 'あなたは仮先です<br />白を青い四角の中に打ってください' : 'You are a tentative black player.<br />Place a white stone in the bule rect.')
                        draw2ndGuide(ctxGuide)
                    }
                    else {
                        altMove.checked = false
                        guideToast(lang == "ja" ? 'あなたは黒です<br />OKをクリックしなくても石を打てば<br />このメッセージは消えます' : 'You are a black player.')
                    }
                    doFirstMove()
                }
                break
            case T_WHITE_START:
                if (blackPlayer == NET_WAITING || whitePlayer == NET_WAITING) {
                    history.pushState(null, null, baseUrl)
                    blackPlayer = NET_HUMAN
                    whitePlayer = HUMAN
                    data = data.subarray(msgpack.unpackedLength())
                    if (msgpack.unpack(data)) {
                        altMove.checked = true
                        guideToast()
                        guideToast(lang == "ja" ? 'あなたは仮後です<br />3つの石が仮先によって打たれるまで待ってください<br />OKをクリックしなくてもこのメッセージは消えます' : 'You are a tentative white player.<br />Wait 3 stone will be put by tentative black player.<br />This dialog is automatically closed when your oppornent puts stone.')
                    }
                    else {
                        altMove.checked = false
                        guideToast(lang == "ja" ? 'あなたは白です<br />白を打ってください<br />OKをクリックしなくても石を打てば<br />このメッセージは消えます' : 'You are a white player.<br />Place a white stone.<br />This dialog is automatically closed when you put a stone.')
                    }
                    clearGuide(ctxGuide)
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
                data = data.subarray(msgpack.unpackedLength())
                if (msgpack.unpack(data)) {
                    blackPlayer = [whitePlayer, whitePlayer = blackPlayer][0]
                    swapped = true
                    guideToast(lang == "ja" ? '相手は黒で指すと宣言しました<br />あなたは白と確定しました<br />白を打ってください' : 'Your oppornent chose swapping black and white.<br />Then you are decided as a white player.<bt />Place a white stone.')
                }
                else {
                    guideToast(lang == "ja" ? '相手は白で指すと宣言しました<br />あなたは黒と確定しました<br />相手が白を打つのを待ってください' : "Your oppornent didn't choose swapping.<br />Then you are decided as a black player.<br />Wait a white player's move.")
                }
                break
            case RESIGN:
                guideToast(lang == "ja" ? '相手が投了しました' : 'Your oppornent has been resigned.')
                playing = false
                $(resign).prop('disabled', true)
                $(draw).prop('disabled', true)
                $(gameType).prop('disabled', false)
                $(altMove).prop('disabled', false)
                break;
            case DRAW_REQ:
                $.toast({
                    text: lang == "ja" ? '対戦相手が引き分けを提案してきました<br />受け入れますか？<br /><input type="button" name="yes" id="yes" value="はい">    <input type="button" name="no" id="no" value="いいえ">' : 'Your oppornent is requesting draw. Accept?<br /><input type="button" name="yes" id="yes" value="Yes">    <input type="button" name="no" id="no" value="No">',
                    hideAfter: false,
                    stack: false,
                    position: { left : 100, right : 'auto', top : 100, bottom : 'auto' }
                })
                $("#yes").on('click', function () {
                    var a = msgpack.pack(DRAW_ACCEPT)
                    var b = new Uint8Array(a)
                    ws.send(b)
                    $.toast().reset('all')
                    guideToast(lang == "ja" ? '引き分けです' : 'Draw.')
                    playing = false
                    $(resign).prop('disabled', true)
                    $(draw).prop('disabled', true)
                    $(gameType).prop('disabled', false)
                    $(altMove).prop('disabled', false)
                })
                $("#no").on('click', function () {
                    var a = msgpack.pack(DRAW_REJECT)
                    var b = new Uint8Array(a)
                    ws.send(b)
                    guideToast(lang == "ja" ? '引き分けでを拒否しました' : 'You rejected the draw request.')
                })
                break
            case DRAW_ACCEPT:
                guideToast(lang == "ja" ? '相手が引き分けを受け入れました' : 'Your oppornent accepted the draw request.')
                playing = false
                $(resign).prop('disabled', true)
                $(draw).prop('disabled', true)
                $(gameType).prop('disabled', false)
                $(altMove).prop('disabled', false)
                break
            case DRAW_REJECT:
                guideToast(lang == "ja" ? '相手が引き分けを拒否しました' : 'Your oppornent rejected the draw request.')
                break
            case PASS:
                guideToast(lang == "ja" ? '相手がパスしました<br />あなたの番です' : "Your oppornent passed.<br />It's your turn.")
                score.pass()
                break
            }
        }
    }
    function drawTouchGuide(ctx, pos) {
        ctx.beginPath()
        ctx.lineWidth = 6
        ctx.strokeStyle = "#CC5555"
        ctx.moveTo(BASE * (pos.x + 1), BASE)
        ctx.lineTo(BASE * (pos.x + 1), BASE * MAX)
        ctx.moveTo(BASE, BASE * (pos.y + 1))
        ctx.lineTo(BASE * MAX, BASE * (pos.y + 1))
        ctx.closePath()
        ctx.stroke()

        ctx.stroke()
    }
    function clearTouchGuide(ctx) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    }
    function draw2ndGuide(ctx) {
        clearGuide(ctx)
        ctx.beginPath()
        ctx.lineWidth = 3
        ctx.strokeStyle = "#0066FF"
        var margin = BASE*0.3
        ctx.rect((8-2)*BASE+margin, (8-2)*BASE+margin, BASE*4-margin*2, BASE*4-margin*2)
        ctx.stroke()
    }
    function draw3rdGuide(ctx) {
        clearGuide(ctx)
        ctx.beginPath()
        ctx.lineWidth = 3
        ctx.strokeStyle = "#0066FF"
        var margin = BASE*0.3
        ctx.rect((8-3)*BASE+margin, (8-3)*BASE+margin, BASE*6-margin*2, BASE*6-margin*2)
        ctx.stroke()
    }
    function clearGuide(ctx) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
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
    function guideToast(str) {
        $.toast({
            text: str + '<br /><input type="button" name="ok" id="ok" value="OK"> ',
            hideAfter: false,
            stack: false,
            position: { left : 100, right : 'auto', top : 100, bottom : 'auto' }

        })
        $("#ok").on('click', function () {
            $.toast().reset('all')
        })
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
                    { "name":lang == "ja" ? "寒星" : "Kansei",    "pos": new Position(7, 5) },
                    { "name":lang == "ja" ? "渓月" : "Keigetsu",  "pos": new Position(8, 5) },
                    { "name":lang == "ja" ? "疎星" : "Sosei",     "pos": new Position(9, 5) },
                    { "name":lang == "ja" ? "花月" : "Kagetsu",   "pos": new Position(8, 6) },
                    { "name":lang == "ja" ? "残月" : "Zangetsu",  "pos": new Position(9, 6) },
                    { "name":lang == "ja" ? "雨月" : "Ugetsu",    "pos": new Position(8, 7) },
                    { "name":lang == "ja" ? "金星" : "Kinsei",    "pos": new Position(9, 7) },
                    { "name":lang == "ja" ? "松月" : "Shougetsu", "pos": new Position(7, 8) },
                    { "name":lang == "ja" ? "丘月" : "Kyugetsu",  "pos": new Position(8, 8) },
                    { "name":lang == "ja" ? "新月" : "Shingetsu", "pos": new Position(9, 8) },
                    { "name":lang == "ja" ? "瑞星" : "Zuisei",    "pos": new Position(7, 9) },
                    { "name":lang == "ja" ? "山月" : "Sangetsu",  "pos": new Position(8, 9) },
                    { "name":lang == "ja" ? "遊星" : "Yuusei",    "pos": new Position(9, 9) },
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
                        { "name":lang == "ja" ? "長星" : "Chousei",   "pos": new Position(9, 5) },
                        { "name":lang == "ja" ? "峡月" : "Kyougetsu", "pos": new Position(9, 6) },
                        { "name":lang == "ja" ? "恒星" : "Kousei",    "pos": new Position(9, 7) },
                        { "name":lang == "ja" ? "水月" : "Suigetsu",  "pos": new Position(9, 8) },
                        { "name":lang == "ja" ? "流星" : "Ryusei",    "pos": new Position(9, 9) },
                        { "name":lang == "ja" ? "雲月" : "Ungetsu",   "pos": new Position(8, 7) },
                        { "name":lang == "ja" ? "浦月" : "Hogetsu",   "pos": new Position(8, 8) },
                        { "name":lang == "ja" ? "嵐月" : "Rangetsu",  "pos": new Position(8, 9) },
                        { "name":lang == "ja" ? "銀月" : "Gingetsu",  "pos": new Position(7, 8) },
                        { "name":lang == "ja" ? "明星" : "Myoujyou",  "pos": new Position(7, 9) },
                        { "name":lang == "ja" ? "斜月" : "Shagetsu",  "pos": new Position(6, 8) },
                        { "name":lang == "ja" ? "名月" : "Meigetsu",  "pos": new Position(6, 9) },
                        { "name":lang == "ja" ? "彗星" : "Suisei",    "pos": new Position(5, 9) },
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
