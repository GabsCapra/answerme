const defaultAnswers = require("./../default/answers.json");



function preventStutter(word) { //pra evitar que os proximos resultados nao saim embaralhados
    return " " + word + " "
}


function normalizeCustom(str) {
    let mapaAcentosHex = {
        a: /[\xE0-\xE6]/g,
        e: /[\xE8-\xEB]/g,
        i: /[\xEC-\xEF]/g,
        o: /[\xF2-\xF6]/g,
        u: /[\xF9-\xFC]/g,
        c: /\xE7/g,
        n: /\xF1/g
    };
    for (let letra in mapaAcentosHex) { //retira acentos
        let expressaoRegular = mapaAcentosHex[letra]
        str = str.replace(expressaoRegular, letra)
    }
    return str
}
function padronizeWords(userInput,homonyms) {     // girias ou variacoes 
    userInput = userInput.replace("?", "").toLowerCase()
    for (let i = 1; i < homonyms.length; i++) { // i = 1 skip sys tag
        let default_word = homonyms[i][0]
        for (let ii = 0; ii < homonyms[i][1].length; ii++){
            let words = homonyms[i][1][ii]

            //console.log(homonyms[i][0])
            //console.log(homonyms[i][1][ii])
        userInput = normalizeCustom(preventStutter(userInput).replace(preventStutter(words), preventStutter(default_word)))
        }
    } //replace nos sinonimos

    return userInput //entrega com as palavras com significados iguais convertidas para palavra padrao
}



function rememberQuestions(json) { //retorna question keys memorizadas
    let result = [];
    let keys = Object.keys(json);
    keys.forEach(function (key) {
        result.push(json[key]);
    });

    return result
}

function buildStringWithCounter(str, numbers) { //monta string com counter
    if ((numbers >= 0) || (numbers <= 99)) {
        numbers = "00" + numbers
    } else if ((numbers > 9) || (numbers <= 99)) {
        numbers = "0" + numbers
    } else if ((numbers > 99) || (numbers <= 999)) {
        numbers = toString(numbers)
    } else {
        numbers = "ERR"
    }
    let result = str + numbers
    return result
}

function searchByCounter(str) { //procura se string prossui contador true false
    let prefix = "%%"
    let newString = str.substring(str.length - 5, str.length - 3)
    let result = false
    if (newString === prefix) {
        result = true
    }
    return result
}

function removeCounter(str) { //remove contador da string para comparações - add validacao
    return str.substring(0, str.length - 5)
}

function getCounter(str) { //add validacao
    return parseInt(str.substring(str.length - 3, str.length))
}

function thinkingAboutKeys(array) { // filtra chaves reconhecidas pelo maior contador informado pela AnalyzeKeys (independente de quantas keys forem)
    let memoryCache // para futuras implementacoes tb 
    let moreLikely

    if (array.length === 0) {
        moreLikely = ["%%dontknow%%"]
    } else {
        for (let i = 0; i < array.length; i++) { //filtra os contadores
            if (memoryCache) {
                if (getCounter(array[i]) >= getCounter(memoryCache[0])) {
                    memoryCache.unshift(array[i])
                } else {
                    memoryCache.push(array[i])
                }
            } else {
                memoryCache = []
                memoryCache.unshift(array[i])
            }
        } //para proximas ideias no reconhecimento
        //console.log(memoryCache)

        moreLikely = [memoryCache[0]] // filtra cache com o maior(ou maiores iguais) contador(res)  -- add validacao
        for (let i = 1; i < memoryCache.length; i++) {
            if (getCounter(memoryCache[i]) === getCounter(moreLikely[0])) {
                moreLikely.push(removeCounter(memoryCache[i]))
            }
        }
        moreLikely[0] = removeCounter(moreLikely[0])
    }
    return [moreLikely, memoryCache]
}

function analyzeQuestion(hmmIRemember, userInput, memorizedAnswers, homonyms) { //dividido em parcial e final/ compara as palavras do input com as questoes memorizadas
    let partialAnalysis = [] //analise parcial
    userInput = padronizeWords(userInput.toLowerCase(), homonyms)
    //console.log(userInput)
    if (hmmIRemember[0] === "%%dontknow%%") { // converte o nao reconhecido em nao lembrado rs
        partialAnalysis.push(hmmIRemember)
    }
    hmmIRemember.forEach(itemRemembered => { //verifica tudo q ele lembrou ao ler o que o usuario perguntou
        rememberQuestions(memorizedAnswers).forEach(obj => { //carrega cada objetos do json
            if (obj.id === itemRemembered) { //compara cada palavra do input com da pergunta gravada na memoria
                let memorizedQuestion = obj.questions
                let resultList = []
                for (let i = 0; i < memorizedQuestion.length; i++) { //divide frases em palavras
                    let splitedMemQuestion = memorizedQuestion[i].split(" ")
                    let splitedInputUser = userInput.split(" ")
                    let counterEqualWords = 0

                    for (let ii = 0; ii < splitedMemQuestion.length; ii++) { //compara as palavras
                        const wordInMem = splitedMemQuestion[ii]
                        for (let iii = 0; iii < splitedInputUser.length; iii++) {
                            const wordInInput = splitedInputUser[iii]
                            if (wordInInput === wordInMem) {
                                counterEqualWords++ // contadoooor
                            }
                        }
                    }
                    let percentualResult = Math.floor(counterEqualWords / splitedMemQuestion.length * 100)
                    resultList.push(percentualResult)
                }
                let result = resultList[0] //add validacao
                for (let ii = 0; ii < resultList.length; ii++) { //filtra o maior contador
                    if (resultList[ii] > result) {
                        result = resultList[ii]
                    }
                }
                partialAnalysis.push([obj.id, result])
            }
        })
    })
    let finalAnalisys // analise final
    let cache = []
    if (partialAnalysis.length > 1) { //confere se apos analisar a questao se ainda existe um empate
        //finalAnalisys.push("%%draw%%") //seta aqui o prefixo para responder empate

        for (let i = 0; i < partialAnalysis.length; i++) {
            if (i === 0) {
                cache.push(partialAnalysis[i])
            } else {

                if (partialAnalysis[i][1] > cache[0][1]) {
                    finalAnalisys = partialAnalysis[i][0]

                } else if (partialAnalysis[i][1] === cache[0][1]) {

                    finalAnalisys = [cache[0][0]]
                    for (let ii = 0; ii < partialAnalysis.length; ii++) {
                        finalAnalisys.push(partialAnalysis[i][0])
                    }
                }
            }

        }

    } else {
        finalAnalisys = partialAnalysis[0][0]
    }
    return finalAnalisys
}

function analyzeKeys(recognizingSomething) { //analisa lista de keys reconhecidas - para futuras implementações
    let thingsList = []
    let alreadyRecognized = false

    for (let i = 0; i < recognizingSomething.length; i++) {//separa os itens reconhecidos
        const itemRecognized = recognizingSomething[i]

        for (let ii = 0; ii < thingsList.length; ii++) { //separa os itens memorizados
            const itemMemorized = thingsList[ii]

            if (itemMemorized === itemRecognized) { //compara
                alreadyRecognized = true
            } else {

                if (searchByCounter(itemMemorized)) {

                    if (removeCounter(itemMemorized) === itemRecognized) {
                        alreadyRecognized = true
                    }
                }
            }
        }
        let prefixCounter = "%%"
        let counter = 0
        if (alreadyRecognized) {
            for (let ii = 0; ii < thingsList.length; ii++) {
                let thing = thingsList[ii]

                if (removeCounter(thing) === itemRecognized) {
                    counter++
                    let numbers = parseInt(thing.substring(thing.length - 3, thing.length)) + 1
                    thingsList[ii] = buildStringWithCounter(thingsList[ii].substring(0, thing.length - 3), numbers)

                } else if (thing === itemRecognized) {
                    thingsList[ii] = buildStringWithCounter(thingsList[ii] + prefixCounter, counter)

                }
            }
        } else {
            counter++
            thingsList.push(buildStringWithCounter(itemRecognized + prefixCounter, counter))
        }
    }

    return thingsList
}

function getAnswersById(id, memorizedAnswers) { // retorna respostas do json pelo id da pergunta
    let result = []
    let resultCT = 0
    if (Array.isArray(id)) { // em caso de empate ele recebe mais de 1 lista, entao ele processa a resposta para empate aqui
        for (let i = 0; i < id.length - 1; i++) {
            const eachId = id[i]
            for (let ii = 0; ii < memorizedAnswers.length; ii++) {
                const memorizedId = memorizedAnswers[ii].id
                if (result[0] === undefined) {
                    if (memorizedAnswers[0].id === "sys") {
                        result.push(memorizedAnswers[0].answers[1])
                    } else {
                        result.push(defaultAnswers[0].answers[1])
                    }
                } else if ((result[0] !== undefined) && (memorizedId === eachId)) {
                    if (resultCT === 0) {
                        result.push(memorizedAnswers[ii].desc)
                    } else {
                        if (result[resultCT - 1] !== memorizedAnswers[ii].desc) {
                            result.push(memorizedAnswers[ii].desc)
                        }
                    }
                    resultCT++
                }
            }

        }
    } else if (id === "%%dontknow%%") { // se nao reconhecer nenhuma chave, nada!

        if (memorizedAnswers[0].id === "sys") {
            if (memorizedAnswers[0].answers[0] === undefined) {
                result.push(memorizedAnswers[0].answers[0])
            } else if (memorizedAnswers[0].answers[0] === "") {
                result.push(memorizedAnswers[0].answers[0])
            } else {
                result.push(memorizedAnswers[0].answers[0])
            }
        } else {
            if (memorizedAnswers[0].answers[0] === undefined) {
                result.push(defaultAnswers[0].answers[0])
            } else if (memorizedAnswers[0].answers[0] === "") {
                result.push(defaultAnswers[0].answers[0])
            } else {
                result.push(memorizedAnswers[0].answers[0])
            }
        }


    } else { //se souber e for somente 1 item,  caso limpo
        for (let i = 0; i < memorizedAnswers.length; i++) {
            const memorizedId = memorizedAnswers[i].id
            if (memorizedId === id) {
                result = memorizedAnswers[i].answers
            }
        }

    }

    return result
}

function compareWords(userInput, memorizedWord) { //compara palavras - so strings por enquanto
    let result = false
    if (userInput.includes(memorizedWord)) {
        result = true
    }
    return result
}

exports.reply = (msg, memorizedAnswers, homonyms) => {
    let recognizingSomething = []

    userInput = padronizeWords(msg, homonyms) // aplica padrao para palavras com msm significado
    let rememberCt = 0
    rememberQuestions(memorizedAnswers).forEach(memorizedQuestion => { //verifica se cada key existe no userInput
        let keys = memorizedQuestion.keys
        let passedCounter = 0
        let twoFactory_1 = false //validar as 2 keys
        let twoFactory_2 = false


        if (Array.isArray(keys)) { // precisa receber uma lista - é regra
            for (let i = 0; i < keys.length; i++) { //compara palavras vindas do usuarios com as keys
                if (Array.isArray(keys[i])) {
                    let checkKeys = keys[i]
                    for (let ii = 0; ii < checkKeys.length; ii++) {
                        if ((passedCounter === 0) && (compareWords(userInput, checkKeys[ii]))) {
                            twoFactory_2 = true
                        } else if ((passedCounter === 1) && (compareWords(userInput, checkKeys[ii]))) {
                            twoFactory_1 = true

                        } else if (passedCounter > 1) {
                            console.log(" Hey, estão me enviando chave a mais para analisar!! max: 2")
                        }
                    }
                } else {
                    if ((passedCounter === 0) && (compareWords(userInput, keys[i]))) {
                        twoFactory_2 = true
                    } else if ((passedCounter === 1) && (compareWords(userInput, keys[i]))) {
                        twoFactory_1 = true
                    } else if (passedCounter > 1) { //precisa vir uma lista de keys com 2 posicoes - a regra é clara!
                        console.log(" Receiving an invalid keys list!")
                    }
                }

                if ((twoFactory_1) && (twoFactory_2)) {
                    recognizingSomething.push(memorizedQuestion.id)
                }
                passedCounter++
            }
        } else {//precisa vir uma lista de keys com 2 posicoes  - a regra é clara!
            if (rememberCt > 0) {
                console.log(" Receiving an invalid keys list!")
                //recognizingSomething.push(memorizedQuestion.id)
            }

        }
        rememberCt++
    })
    const myBrainIsArching = thinkingAboutKeys(analyzeKeys(recognizingSomething))//analisa as keys identificadas e processa qual delas foi a mais acessada 
    //const keyCompareCache = myBrainIsArching[1]//para futuras atualizacoes
    const hmmIRemember = myBrainIsArching[0]


    //envia a resposta ja validada pelo analyzeQuestion
    return getAnswersById(analyzeQuestion(hmmIRemember, userInput, memorizedAnswers, homonyms), memorizedAnswers) //gambiarra para armazenar perguntas desconhecidas --arrumar depois
}



