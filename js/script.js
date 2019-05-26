const map = document.querySelector('.map')
const tiles = document.querySelectorAll('.tile')
const image = (() => {
  const canvas = document.createElement('canvas')
  const image = new Image()

  canvas.width = 1
  canvas.height = 1
  image.src = canvas.toDataURL()

  return image
})()
const links = []
const states = {}
let drops = []

const match = drop => {
  return link =>
    link.startIndex === drop.startIndex && link.stopIndex === drop.stopIndex ||
    link.startIndex === drop.stopIndex && link.stopIndex === drop.startIndex
}

const link = drop => {
  const start = tiles[drop.startIndex]
  const stop = tiles[drop.stopIndex]

  if ('link' in start.dataset) {
    start.dataset.link += ' ' + drop.start
  } else {
    start.dataset.link = drop.start
  }

  if ('link' in stop.dataset) {
    stop.dataset.link += ' ' + drop.stop
  } else {
    stop.dataset.link = drop.stop
  }

  links.push(drop)
}

const unlink = drop => {
  const start = tiles[drop.startIndex]
  const stop = tiles[drop.stopIndex]
  const index = links.findIndex(match(drop))

  if (index !== -1) links.splice(index, 1)

  start.dataset.link = start.dataset.link
    .replace(drop.start, '')
    .replace(/ {2,}/g, ' ')
    .trim()
  if (!start.dataset.link) delete start.dataset.link
  stop.dataset.link = stop.dataset.link
    .replace(drop.stop, '')
    .replace(/ {2,}/g, ' ')
    .trim()
  if (!stop.dataset.link) delete stop.dataset.link
}

const state = ([index, state]) => {
  if (!(tiles[index].dataset.state = states[index] = state)) {
    delete tiles[index].dataset.state
    delete states[index]
  }
}

const getIndex = element => Array.prototype.indexOf.call(
  tiles,
  element.matches('.room')
    ? element.parentElement
    : element
)

try {
  const cached = JSON.parse(localStorage.links)
  cached.forEach(link)
} catch (error) {
  localStorage.links = JSON.stringify(links)
}

try {
  const cached = JSON.parse(localStorage.states)
  Object.entries(cached).forEach(state)
} catch (error) {
  localStorage.states = JSON.stringify(states)
}

const onResize = () => {
  const min = `${Math.min(window.innerWidth * 0.70, window.innerHeight * 0.99)}px`

  map.style.width = min
  map.style.height = min
}

onResize()

window.addEventListener('resize', onResize, { passive: true })

map.addEventListener('dragstart', event => {
  const index = getIndex(event.target)
  const column = index % 8
  const row = (index - column) / 8

  drops = []

  if (row >= 1) {
    drops.push({ start: 'top', stop: 'bottom', cursor: 'nesw-resize', startIndex: index, stopIndex: index - 8 })
  }
  if (column < 7) {
    drops.push({ start: 'right', stop: 'left', cursor: 'nwse-resize', startIndex: index, stopIndex: index + 1 })
  }
  if (row < 7) {
    drops.push({ start: 'bottom', stop: 'top', cursor: 'nesw-resize', startIndex: index, stopIndex: index + 8 })
  }
  if (column >= 1) {
    drops.push({ start: 'left', stop: 'right', cursor: 'nwse-resize', startIndex: index, stopIndex: index - 1 })
  }

  event.dataTransfer.dropEffect = 'link'
  event.dataTransfer.setDragImage(image, 0, 0)
})

map.addEventListener('dragover', event => {
  const index = getIndex(event.target)

  if (drops.some(({ stopIndex }) => stopIndex === index)) {
    event.preventDefault()
  }
})

map.addEventListener('dragenter', event => {
  const index = getIndex(event.target)
  const drop = drops.find(({ stopIndex }) => stopIndex === index)

  if (drop) {
    const exists = links.some(match(drop))

    if (exists) {
      unlink(drop)
    } else {
      link(drop)
    }

    map.style.cursor = drop.cursor
  }
})

map.addEventListener('dragleave', event => {
  const index = getIndex(event.target)
  const drop = drops.find(({ stopIndex }) => stopIndex === index)

  if (drop) {
    const exists = links.some(match(drop))

    if (exists) {
      unlink(drop)
    } else {
      link(drop)
    }

    map.style.removeProperty('cursor')
  }
})

map.addEventListener('drop', event => {
  const index = getIndex(event.target)
  const drop = drops.find(({ stopIndex }) => stopIndex === index)

  if (drop) {
    localStorage.links = JSON.stringify(links)
  }
})

map.addEventListener('dragend', event => {
  map.style.removeProperty('cursor')
})

map.addEventListener('click', event => {
  const index = getIndex(event.target)

  if (index !== -1) {
    if (states[index] === 'enter') {
      state([index, ''])
    } else if (states[index] === 'clear') {
      state([index, 'enter'])
    } else if (states[index] === 'fight') {
      state([index, 'clear'])
    } else {
      state([index, 'fight'])
    }

    localStorage.states = JSON.stringify(states)
  }
})

const translate = fn => {
  links.slice().map(drop => {
    unlink(drop)

    drop.startIndex = fn(drop.startIndex)
    drop.stopIndex = fn(drop.stopIndex)

    return drop
  }).forEach(link)
  Object.entries(states).map(([key, value]) => {
    const index = Number(key)

    state([index, ''])

    return [fn(index), value]
  }).forEach(state)
}

document.addEventListener('keyup', event => {
  switch (event.code) {
  case 'Escape':
    links.slice().forEach(unlink)
    Object.keys(states).forEach(index => state([index, '']))
    break
  case 'ArrowUp':
    translate(index => (index + 56) % 64)
    break
  case 'ArrowRight':
    translate(index => {
      const column = index % 8
      return index - column + (column + 1) % 8
    })
    break
  case 'ArrowDown':
    translate(index => (index + 8) % 64)
    break
  case 'ArrowLeft':
    translate(index => {
      const column = index % 8
      return index - column + (column + 7) % 8
    })
    break
  }

  localStorage.links = JSON.stringify(links)
  localStorage.states = JSON.stringify(states)
})
