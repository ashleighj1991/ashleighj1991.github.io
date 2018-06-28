/*   Chatbot Assistant Prototype using dialogflow
 */

const accessToken = '32b97368f168447cb5017b64713a9b23'
const baseUrl = 'https://api.api.ai/api/query?v=20150910'
const sessionId = '1234567890'
const loadingMarkups = `<span class='loader'><span class='loader__dot'></span><span class='loader__dot'></span><span class='loader__dot'></span></span>`
const errorMessage = 'My apologies, I\'m not available at the moment. =^.^='
const urlPattern = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim
const loadingDelay = 700
const aiReplyDelay = 1800

const $document = document
const $chatbot = $document.querySelector('.chatbot')
const $chatbotMessageWindow = $document.querySelector('.chatbot__message-window')
const $chatbotHeader = $document.querySelector('.chatbot__header')
const $chatbotMessages = $document.querySelector('.chatbot__messages')
const $chatbotInput = $document.querySelector('.chatbot__input')
const $chatbotSubmit = $document.querySelector('.chatbot__submit')

document.addEventListener('keypress', event => {
  if (event.which == 13) {
    validateMessage()
  }
}, false)

$chatbotHeader.addEventListener('click', () => {
  toggle($chatbot, 'chatbot--closed')
  $chatbotInput.focus()
}, false)

$chatbotSubmit.addEventListener('click', () => {
  validateMessage()
}, false)

let toggle = (element, klass) => {
  let classes = element.className.match(/\S+/g) || [],
    index = classes.indexOf(klass)
  index >= 0 ? classes.splice(index, 1) : classes.push(klass)
  element.className = classes.join(' ')
}

let userMessage = content => {
  $chatbotMessages.innerHTML += `<li class='is-user animation'>
      <p class='chatbot__message'>
        ${content}
      </p>
      <span class='chatbot__arrow chatbot__arrow--right'></span>
    </li>`
}

let aiMessage = (content, isLoading = false, delay = 0) => {
  setTimeout(() => {
    removeLoader()
    $chatbotMessages.innerHTML += `<li 
      class='is-ai animation' 
      id='${isLoading ? "is-loading" : ""}'>
        <div class="is-ai__profile-picture">
          <svg class="icon-avatar" viewBox="0 0 32 32">
            <use xlink:href="#avatar" />
          </svg>
        </div>
        <span class='chatbot__arrow chatbot__arrow--left'></span>
        <div class='chatbot__message'>
          ${content}
        </div>
      </li>`
    scrollDown()
  }, delay)
}

let removeLoader = () => {
  let loadingElem = document.getElementById('is-loading')
  if (loadingElem) {
    $chatbotMessages.removeChild(loadingElem)
  }
}

let escapeScript = unsafe => {
  let safeString = unsafe
    .replace(/</g, ' ')
    .replace(/>/g, ' ')
    .replace(/&/g, ' ')
    .replace(/"/g, ' ')
    .replace(/\\/, ' ')
    .replace(/\s+/g, ' ')
  return safeString.trim()
}

let linkify = inputText => {
  return inputText.replace(urlPattern, `<a href='$1' target='_blank'>$1</a>`)
}

let validateMessage = () => {
  let text = $chatbotInput.value
  let safeText = text ? escapeScript(text) : ''
  if (safeText.length && safeText !== ' ') {
    resetInputField()
    userMessage(safeText)
    send(safeText)
  }
  scrollDown()
  return
}

let multiChoiceAnswer = text => {
  let decodedText = text.replace(/zzz/g, "'")
  userMessage(decodedText)
  send(decodedText)
  scrollDown()
  return
}

let processResponse = val => {

  removeLoader()

  if (val.fulfillment) {

    let output = ''
    let messagesLength = val.fulfillment.messages.length

    for (let i = 0; i < messagesLength; i++) {

      let message = val.fulfillment.messages[i]
      let type = message.type

      switch (type) {

        // 0 fulfillment is text
        case 0:
          let parsedText = linkify(message.speech)
          output += `<p>${parsedText}</p>`
          break

        // 1 fulfillment is card
        case 1:
          // let imageUrl = message.imageUrl
          // let imageTitle = message.title
          // let imageSubtitle = message.subtitle
          // output += `<img src='${imageUrl}' alt='${imageTitle}${imageSubtitle}' />`
          break

        // 2 fulfillment is button list
        case 2:
          let title = message.title
          let replies = message.replies
          let repliesLength = replies.length
          output += `<p>${title}</p>`

          for (let i = 0; i < repliesLength; i++) {
            let reply = replies[i]
            let encodedText = reply.replace(/'/g, 'zzz')
            output += `<button onclick='multiChoiceAnswer("${encodedText}")'>${reply}</button>`
          }

          break

        // 3 fulfillment is image
        case 3:
          // console.log('Fulfillment is image - TODO')
          break
      }

    }

    return output

  } else {
    return val
  }
}

let setResponse = (val, delay = 0) => {
  setTimeout(() => {
    aiMessage(processResponse(val))
  }, delay)
}

let resetInputField = () => {
  $chatbotInput.value = ''
}

let scrollDown = () => {
  let distanceToScroll =
    $chatbotMessageWindow.scrollHeight -
    ($chatbotMessages.lastChild.offsetHeight + 60)
  $chatbotMessageWindow.scrollTop = distanceToScroll
  return false
}

let send = (text = '') => {
  fetch(`${baseUrl}&query=${text}&lang=en&sessionId=${sessionId}`, {
    method: 'GET',
    dataType: 'json',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json; charset=utf-8'
    }
  })
  .then(response => response.json())
  .then(res => {
    if (res.status < 200 || res.status >= 300) {
      let error = new Error(res.statusText)
      throw error
    }
    return res
  })
  .then(res => {
    setResponse(res.result, loadingDelay + aiReplyDelay)
  })
  .catch(error => {
    setResponse(errorMessage, loadingDelay + aiReplyDelay)
    resetInputField()
    console.log(error)
  })

  aiMessage(loadingMarkups, true, loadingDelay)
}
