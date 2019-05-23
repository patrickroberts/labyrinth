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

const link = (drop) => {
  if ('link' in tiles[drop.startIndex].dataset) {
    tiles[drop.startIndex].dataset.link += ' ' + drop.start
  } else {
    tiles[drop.startIndex].dataset.link = drop.start
  }

  if ('link' in tiles[drop.stopIndex].dataset) {
    tiles[drop.stopIndex].dataset.link += ' ' + drop.stop
  } else {
    tiles[drop.stopIndex].dataset.link = drop.stop
  }

  links.push(drop)
}

const state = ([index, state]) => {
  tiles[index].dataset.state = states[index] = state
}

const translate = (fn) => {
  links.splice(0, links.length).map(link => {
    delete tiles[link.startIndex].dataset.link
    delete tiles[link.stopIndex].dataset.link

    link.startIndex = fn(link.startIndex)
    link.stopIndex = fn(link.stopIndex)

    return link
  }).forEach(link)
  Object.entries(states).map(([key, state]) => {
    const index = Number(key)

    delete tiles[index].dataset.state
    delete states[index]

    return [fn(index), state]
  }).forEach(state)
}

const match = (drop) => {
  return link =>
    link.startIndex === drop.startIndex && link.stopIndex === drop.stopIndex ||
    link.startIndex === drop.stopIndex && link.stopIndex === drop.startIndex
}

const onResize = () => {
  const min = `${Math.min(window.innerWidth * 0.70, window.innerHeight * 0.99)}px`

  map.style.width = min
  map.style.height = min
}

onResize()

window.addEventListener('resize', onResize, { passive: true })

map.addEventListener('dragstart', event => {
  const index = Array.prototype.indexOf.call(tiles, event.target)
  const column = index % 8
  const row = (index - column) / 8

  drops = []

  if (row >= 1) {
    drops.push({ start: 'top', stop: 'bottom', cursor: 'nesw-resize', startIndex: index, stopIndex: index - 8 })
  }
  if (column >= 1) {
    drops.push({ start: 'left', stop: 'right', cursor: 'nwse-resize', startIndex: index, stopIndex: index - 1 })
  }
  if (column < 7) {
    drops.push({ start: 'right', stop: 'left', cursor: 'nwse-resize', startIndex: index, stopIndex: index + 1 })
  }
  if (row < 7) {
    drops.push({ start: 'bottom', stop: 'top', cursor: 'nesw-resize', startIndex: index, stopIndex: index + 8 })
  }

  event.dataTransfer.dropEffect = 'link'
  event.dataTransfer.setDragImage(image, 0, 0)
})

map.addEventListener('dragover', event => {
  const index = Array.prototype.indexOf.call(tiles, event.target)

  if (drops.some(({ stopIndex }) => stopIndex === index)) {
    event.preventDefault()
  }
})

map.addEventListener('dragenter', event => {
  const index = Array.prototype.indexOf.call(tiles, event.target)
  const drop = drops.find(({ stopIndex }) => stopIndex === index)

  if (drop) {
    const exists = links.some(match(drop))

    if (exists) {
      tiles[drop.startIndex].style[`border-${drop.start}`] = '2px solid #00f'
      tiles[drop.stopIndex].style[`border-${drop.stop}`] = '2px solid #bbb'
    } else {
      tiles[drop.startIndex].style[`border-${drop.start}`] = '2px solid transparent'
      tiles[drop.stopIndex].style[`border-${drop.stop}`] = '2px solid transparent'
    }

    map.style.cursor = drop.cursor
  }
})

map.addEventListener('dragleave', event => {
  const index = Array.prototype.indexOf.call(tiles, event.target)
  const drop = drops.find(({ stopIndex }) => stopIndex === index)

  if (drop) {
    tiles[drop.startIndex].style.removeProperty(`border-${drop.start}`)
    tiles[drop.stopIndex].style.removeProperty(`border-${drop.stop}`)
    map.style.removeProperty('cursor')
  }
})

map.addEventListener('drop', event => {
  const index = Array.prototype.indexOf.call(tiles, event.target)
  const drop = drops.find(({ stopIndex }) => stopIndex === index)

  if (drop) {
    const elem = links.find(match(drop))

    if (!elem) {
      link(drop)
      localStorage.links = JSON.stringify(links)
    } else {
      const start = tiles[drop.startIndex]
      const stop = tiles[drop.stopIndex]

      links.splice(links.indexOf(elem), 1)
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
  }
})

map.addEventListener('dragend', event => {
  tiles.forEach(tile => tile.removeAttribute('style'))
  map.style.removeProperty('cursor')
})

map.addEventListener('click', event => {
  if (event.target.matches('.tile')) {
    const index = Array.prototype.indexOf.call(tiles, event.target)

    if (states[index] === 'enter') {
      delete event.target.dataset.state
      delete states[index]
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

document.addEventListener('keyup', event => {
  switch (event.code) {
  case 'Escape':
    links.splice(0, links.length).forEach(link => {
      delete tiles[link.startIndex].dataset.link
      delete tiles[link.stopIndex].dataset.link
    })
    Object.keys(states).forEach(index => {
      delete tiles[index].dataset.state
      delete states[index]
    })
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
