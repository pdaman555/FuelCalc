;(function () {
	'use strict'

	// ── DOM refs ──
	const fuelInput = document.getElementById('fuel')
	const consumptionInput = document.getElementById('consumption')
	const fuelUnit = document.getElementById('fuelUnit')
	const consumptionUnit = document.getElementById('consumptionUnit')
	const fuelPrice = document.getElementById('fuelPrice')
	const travelSpeed = document.getElementById('travelSpeed')
	const priceUnit = document.getElementById('priceUnit')

	const mileageInput = document.getElementById('mileage')
	const avgSpeedInput = document.getElementById('avgSpeed')
	const hourlyRate = document.getElementById('hourlyRate')

	const resultNumber = document.getElementById('resultNumber')
	const resultUnit = document.getElementById('resultUnit')
	const resultLabel = document.getElementById('resultLabel')
	const resultSub = document.getElementById('resultSub')
	const resultContainer = document.getElementById('resultContainer')
	const extraResults = document.getElementById('extraResults')
	const costValue = document.getElementById('costValue')
	const timeValue = document.getElementById('timeValue')

	const toggleBtns = document.querySelectorAll('.unit-toggle button')
	const modeToggleBtns = document.querySelectorAll('.mode-toggle button')
	const rangeInputs = document.getElementById('rangeInputs')
	const hoursInputs = document.getElementById('hoursInputs')
	const modeIcon = document.getElementById('modeIcon')
	const modeTitle = document.getElementById('modeTitle')
	const modeDesc = document.getElementById('modeDesc')
	const calculateBtn = document.getElementById('calculateBtn')
	const themeToggle = document.getElementById('themeToggle')

	// Auth & history
	const loginBtn = document.getElementById('loginBtn')
	const registerBtn = document.getElementById('registerBtn')
	const logoutBtn = document.getElementById('logoutBtn')
	const authButtons = document.getElementById('authButtons')
	const userInfo = document.getElementById('userInfo')
	const userNameDisplay = document.getElementById('userNameDisplay')
	const loginModal = document.getElementById('loginModal')
	const registerModal = document.getElementById('registerModal')
	const closeLogin = document.getElementById('closeLogin')
	const closeRegister = document.getElementById('closeRegister')
	const loginForm = document.getElementById('loginForm')
	const registerForm = document.getElementById('registerForm')
	const switchToRegister = document.getElementById('switchToRegister')
	const switchToLogin = document.getElementById('switchToLogin')
	const profileLogin = document.getElementById('profileLogin')
	const profilePassword = document.getElementById('profilePassword')
	const userProfile = document.getElementById('userProfile')
	const noAuthMessage = document.getElementById('noAuthMessage')
	const historyList = document.getElementById('historyList')

	// Chart canvases
	const rangeChartCanvas = document.getElementById('rangeChart')
	const hoursChartCanvas = document.getElementById('hoursChart')
	const costChartCanvas = document.getElementById('costChart')
	const rangeChartEmpty = document.getElementById('rangeChartEmpty')
	const hoursChartEmpty = document.getElementById('hoursChartEmpty')
	const costChartEmpty = document.getElementById('costChartEmpty')

	// ── State ──
	let currentUnit = 'metric'
	let currentMode = 'range'
	let animationTimer = null
	let currentUser = null
	let rangeChartInstance = null
	let hoursChartInstance = null
	let costChartInstance = null

	// ── Theme ──
	function getTheme() {
		return localStorage.getItem('fuelTheme') || 'dark'
	}
	function setTheme(theme) {
		document.body.classList.remove('light-theme', 'dark-theme')
		document.body.classList.add(theme + '-theme')
		localStorage.setItem('fuelTheme', theme)
		themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️'
	}
	function toggleTheme() {
		setTheme(getTheme() === 'dark' ? 'light' : 'dark')
	}

	// ── Helpers ──
	function formatNumber(v) {
		if (v === Infinity || v === -Infinity || isNaN(v)) return '—'
		return Number.isInteger(v) ? v.toString() : v.toFixed(1)
	}
	function getSafeNumber(v) {
		const n = parseFloat(v)
		return isNaN(n) || n < 0 ? 0 : n
	}
	function getSafeConsumption(v) {
		const n = parseFloat(v)
		return isNaN(n) || n <= 0 ? null : n
	}

	// ── History ──
	function getHistory(login) {
		try {
			const all = JSON.parse(localStorage.getItem('fuelHistory')) || {}
			return all[login] || []
		} catch {
			return []
		}
	}
	function saveHistory(login, records) {
		try {
			const all = JSON.parse(localStorage.getItem('fuelHistory')) || {}
			all[login] = records
			localStorage.setItem('fuelHistory', JSON.stringify(all))
		} catch (e) {}
	}
	function addHistoryRecord(login, record) {
		if (!login) return
		let records = getHistory(login)
		records.push({ date: new Date().toLocaleString(), ...record })
		if (records.length > 50) records = records.slice(-50)
		saveHistory(login, records)
	}

	// ── Charts ──
	function buildChart(canvas, label, data, unit, color = '#f9b800') {
		const ctx = canvas.getContext('2d')
		const textColor =
			getComputedStyle(document.body)
				.getPropertyValue('--text-secondary')
				.trim() || 'rgba(255,255,255,0.6)'
		const gridColor = 'rgba(255,255,255,0.05)'
		return new Chart(ctx, {
			type: 'line',
			data: {
				labels: data.map(r => {
					const parts = r.date.split(', ')
					return parts.length > 1 ? parts[1] : r.date
				}),
				datasets: [
					{
						label: label,
						data: data.map(r => r.value || r.result),
						borderColor: color,
						backgroundColor: color + '33',
						borderWidth: 2,
						pointBackgroundColor: color,
						pointRadius: 2,
						fill: true,
						tension: 0.3,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						labels: { color: textColor, font: { size: 9 }, boxWidth: 10 },
					},
				},
				scales: {
					x: {
						ticks: {
							color:
								getComputedStyle(document.body)
									.getPropertyValue('--text-light')
									.trim() || 'rgba(255,255,255,0.3)',
							font: { size: 7 },
							maxRotation: 30,
							autoSkip: true,
							maxTicksLimit: 5,
						},
						grid: { color: gridColor },
					},
					y: {
						ticks: {
							color:
								getComputedStyle(document.body)
									.getPropertyValue('--text-light')
									.trim() || 'rgba(255,255,255,0.3)',
							font: { size: 8 },
						},
						grid: { color: gridColor },
						beginAtZero: true,
					},
				},
				interaction: { intersect: false, mode: 'index' },
			},
		})
	}

	function updateCharts(login) {
		const records = getHistory(login)

		// Range chart
		const rangeRecords = records.filter(r => r.mode === 'range').slice(-10)
		if (rangeRecords.length === 0) {
			rangeChartCanvas.style.display = 'none'
			rangeChartEmpty.classList.add('show')
			if (rangeChartInstance) {
				rangeChartInstance.destroy()
				rangeChartInstance = null
			}
		} else {
			rangeChartCanvas.style.display = 'block'
			rangeChartEmpty.classList.remove('show')
			if (rangeChartInstance) {
				rangeChartInstance.data.labels = rangeRecords.map(r => {
					const p = r.date.split(', ')
					return p.length > 1 ? p[1] : r.date
				})
				rangeChartInstance.data.datasets[0].data = rangeRecords.map(
					r => r.result,
				)
				rangeChartInstance.update()
			} else {
				rangeChartInstance = buildChart(
					rangeChartCanvas,
					'Запас хода',
					rangeRecords,
					'км',
					'#f9b800',
				)
			}
		}

		// Hours chart
		const hoursRecords = records.filter(r => r.mode === 'hours').slice(-10)
		if (hoursRecords.length === 0) {
			hoursChartCanvas.style.display = 'none'
			hoursChartEmpty.classList.add('show')
			if (hoursChartInstance) {
				hoursChartInstance.destroy()
				hoursChartInstance = null
			}
		} else {
			hoursChartCanvas.style.display = 'block'
			hoursChartEmpty.classList.remove('show')
			if (hoursChartInstance) {
				hoursChartInstance.data.labels = hoursRecords.map(r => {
					const p = r.date.split(', ')
					return p.length > 1 ? p[1] : r.date
				})
				hoursChartInstance.data.datasets[0].data = hoursRecords.map(
					r => r.result,
				)
				hoursChartInstance.update()
			} else {
				hoursChartInstance = buildChart(
					hoursChartCanvas,
					'Моточасы',
					hoursRecords,
					'ч',
					'#60a5fa',
				)
			}
		}

		// Cost chart (только для range с указанием стоимости)
		const costRecords = records
			.filter(
				r => r.mode === 'range' && r.cost !== null && r.cost !== undefined,
			)
			.slice(-10)
		if (costRecords.length === 0) {
			costChartCanvas.style.display = 'none'
			costChartEmpty.classList.add('show')
			if (costChartInstance) {
				costChartInstance.destroy()
				costChartInstance = null
			}
		} else {
			costChartCanvas.style.display = 'block'
			costChartEmpty.classList.remove('show')
			const costData = costRecords.map(r => ({ date: r.date, value: r.cost }))
			if (costChartInstance) {
				costChartInstance.data.labels = costData.map(r => {
					const p = r.date.split(', ')
					return p.length > 1 ? p[1] : r.date
				})
				costChartInstance.data.datasets[0].data = costData.map(r => r.value)
				costChartInstance.update()
			} else {
				costChartInstance = buildChart(
					costChartCanvas,
					'Стоимость поездки',
					costData,
					'₽',
					'#4ade80',
				)
			}
		}
	}

	// ── Render history ──
	function renderHistory(login) {
		const records = getHistory(login)
		const lastFive = records.slice(-5).reverse()
		if (lastFive.length === 0) {
			historyList.innerHTML = '<div class="history-empty">Нет записей</div>'
		} else {
			historyList.innerHTML = lastFive
				.map(r => {
					const resultStr = formatNumber(r.result)
					let details = ''
					if (r.mode === 'range') details = `⛽ ${r.input1} · ${r.input2}`
					else details = `🛣️ ${r.input1} · ${r.input2}`
					let extra = ''
					if (r.cost) extra += ` 💰${formatNumber(r.cost)}₽`
					if (r.time) extra += ` ⏱️${formatNumber(r.time)}ч`
					return `<div class="history-item">
                    <div class="history-date">${r.date}</div>
                    <div class="history-details"><span>${details}</span><span>${resultStr} ${r.unit}${extra}</span></div>
                </div>`
				})
				.join('')
		}
		updateCharts(login)
	}

	// ── Сохранение последних значений ──
	function saveLastValues() {
		const values = {
			fuel: fuelInput.value,
			consumption: consumptionInput.value,
			mileage: mileageInput.value,
			avgSpeed: avgSpeedInput.value,
			fuelPrice: fuelPrice.value,
			travelSpeed: travelSpeed.value,
			hourlyRate: hourlyRate.value,
			unit: currentUnit,
			mode: currentMode,
		}
		localStorage.setItem('fuelLastValues', JSON.stringify(values))
	}

	function loadLastValues() {
		try {
			const data = JSON.parse(localStorage.getItem('fuelLastValues'))
			if (data) {
				if (data.fuel) fuelInput.value = data.fuel
				if (data.consumption) consumptionInput.value = data.consumption
				if (data.mileage) mileageInput.value = data.mileage
				if (data.avgSpeed) avgSpeedInput.value = data.avgSpeed
				if (data.fuelPrice) fuelPrice.value = data.fuelPrice
				if (data.travelSpeed) travelSpeed.value = data.travelSpeed
				if (data.hourlyRate) hourlyRate.value = data.hourlyRate
				if (data.unit) setUnit(data.unit)
				if (data.mode) setMode(data.mode)
			}
		} catch (e) {}
	}

	// ── Экспорт ──
	function exportCSV() {
		if (!currentUser) {
			alert('Войдите в систему')
			return
		}
		const records = getHistory(currentUser)
		if (records.length === 0) {
			alert('Нет записей для экспорта')
			return
		}

		let csv =
			'Дата,Режим,Параметр1,Параметр2,Результат,Единица,Стоимость,Время\n'
		records.forEach(r => {
			let input1 = r.input1 || ''
			let input2 = r.input2 || ''
			let mode = r.mode === 'range' ? 'Запас хода' : 'Моточасы'
			let cost = r.cost || ''
			let time = r.time || ''
			csv += `"${r.date}","${mode}","${input1}","${input2}","${r.result}","${r.unit}","${cost}","${time}"\n`
		})

		const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
		const link = document.createElement('a')
		link.href = URL.createObjectURL(blob)
		link.download = `history_${currentUser}_${new Date().toISOString().slice(0, 10)}.csv`
		link.click()
		URL.revokeObjectURL(link.href)
	}

	function exportJSON() {
		if (!currentUser) {
			alert('Войдите в систему')
			return
		}
		const records = getHistory(currentUser)
		if (records.length === 0) {
			alert('Нет записей для экспорта')
			return
		}

		const data = {
			user: currentUser,
			exported: new Date().toISOString(),
			records: records,
		}

		const blob = new Blob([JSON.stringify(data, null, 2)], {
			type: 'application/json',
		})
		const link = document.createElement('a')
		link.href = URL.createObjectURL(blob)
		link.download = `history_${currentUser}_${new Date().toISOString().slice(0, 10)}.json`
		link.click()
		URL.revokeObjectURL(link.href)
	}

	// ── Main Calculate ──
	function calculate(saveHistoryFlag = true) {
		let result, unit, label, subText, input1, input2
		let cost = null
		let time = null
		let timeUnit = 'ч'

		// Скрываем дополнительные результаты
		extraResults.style.display = 'none'

		if (currentMode === 'range') {
			const fuel = getSafeNumber(fuelInput.value)
			const consumption = getSafeConsumption(consumptionInput.value)
			const price = getSafeNumber(fuelPrice.value)
			const speed = getSafeNumber(travelSpeed.value)

			if (fuel === 0) {
				resultContainer.classList.remove('has-value', 'error')
				resultNumber.textContent = '0'
				resultNumber.classList.add('animate')
				resultUnit.textContent = currentUnit === 'metric' ? 'км' : 'миль'
				resultLabel.textContent = '⛽ Бак пуст'
				resultSub.textContent = 'Заправьтесь перед поездкой'
				return
			}
			if (consumption === null || consumption <= 0) {
				resultContainer.classList.remove('has-value')
				resultContainer.classList.add('error')
				resultNumber.textContent = '?'
				resultNumber.classList.add('animate')
				resultUnit.textContent = ''
				resultLabel.textContent = '⚠️ Укажите расход топлива'
				resultSub.textContent = 'Расход должен быть больше нуля'
				return
			}

			let distance
			let fuelUnitLabel
			let priceUnitLabel
			if (currentUnit === 'metric') {
				distance = (fuel / consumption) * 100
				unit = 'км'
				fuelUnitLabel = 'л'
				priceUnitLabel = '₽/л'
				subText = `⛽ ${fuel.toFixed(1)} л · ${consumption.toFixed(1)} л/100 км`
				input1 = fuel.toFixed(1) + ' л'
				input2 = consumption.toFixed(1) + ' л/100 км'
			} else {
				distance = fuel * consumption
				unit = 'миль'
				fuelUnitLabel = 'гал'
				priceUnitLabel = '₽/гал'
				subText = `⛽ ${fuel.toFixed(1)} гал · ${consumption.toFixed(1)} миль/гал`
				input1 = fuel.toFixed(1) + ' гал'
				input2 = consumption.toFixed(1) + ' миль/гал'
			}

			if (!isFinite(distance) || distance < 0) {
				resultContainer.classList.remove('has-value')
				resultContainer.classList.add('error')
				resultNumber.textContent = '∞'
				resultNumber.classList.add('animate')
				resultUnit.textContent = ''
				resultLabel.textContent = '⚠️ Проверьте данные'
				resultSub.textContent = ''
				return
			}

			result = distance

			// Расчёт стоимости поездки
			if (price > 0 && fuel > 0) {
				cost = fuel * price
			}

			// Расчёт времени в пути
			if (speed > 0 && distance > 0) {
				time = distance / speed
				if (time >= 1) {
					timeUnit = 'ч'
				} else {
					time = time * 60
					timeUnit = 'мин'
				}
			}

			resultNumber.textContent = formatNumber(result)
			resultUnit.textContent = unit
			resultSub.textContent = subText

			if (result > 10000) resultLabel.textContent = '🚀 Огромный запас!'
			else if (result > 5000) resultLabel.textContent = '🌟 Отличный запас!'
			else if (result > 1000) resultLabel.textContent = '✅ Хороший запас'
			else if (result > 500) resultLabel.textContent = '👍 Достаточно'
			else if (result > 200) resultLabel.textContent = '🛣️ Скоро заправка'
			else if (result > 50) resultLabel.textContent = '⚠️ Мало топлива'
			else resultLabel.textContent = '🔴 Срочно заправьтесь!'

			// Показываем доп. результаты
			if (cost !== null || time !== null) {
				extraResults.style.display = 'flex'
				costValue.textContent = cost !== null ? formatNumber(cost) + ' ₽' : '—'
				timeValue.textContent =
					time !== null ? formatNumber(time) + ' ' + timeUnit : '—'
			}

			if (saveHistoryFlag && currentUser) {
				addHistoryRecord(currentUser, {
					mode: 'range',
					input1,
					input2,
					result,
					unit,
					cost: cost,
					time: time,
				})
				renderHistory(currentUser)
			}
		} else {
			// hours
			const mileage = getSafeNumber(mileageInput.value)
			const speed = getSafeNumber(avgSpeedInput.value)
			const rate = getSafeNumber(hourlyRate.value)

			if (mileage === 0) {
				resultContainer.classList.remove('has-value', 'error')
				resultNumber.textContent = '0'
				resultNumber.classList.add('animate')
				resultUnit.textContent = 'ч'
				resultLabel.textContent = '🛣️ Пробег = 0'
				resultSub.textContent = 'Укажите пробег'
				return
			}
			if (speed <= 0) {
				resultContainer.classList.remove('has-value')
				resultContainer.classList.add('error')
				resultNumber.textContent = '?'
				resultNumber.classList.add('animate')
				resultUnit.textContent = ''
				resultLabel.textContent = '⚠️ Укажите среднюю скорость'
				resultSub.textContent = 'Скорость должна быть > 0'
				return
			}

			const hours = mileage / speed
			result = hours
			unit = 'ч'
			subText = `🛣️ ${mileage} км · ${speed} км/ч`
			input1 = mileage + ' км'
			input2 = speed + ' км/ч'

			// Расчёт стоимости
			if (rate > 0) {
				cost = hours * rate
			}

			resultNumber.textContent = formatNumber(result)
			resultUnit.textContent = unit
			resultSub.textContent = subText

			if (hours > 10000) resultLabel.textContent = '🔧 Огромный ресурс'
			else if (hours > 5000) resultLabel.textContent = '🔧 Солидный ресурс'
			else if (hours > 1000) resultLabel.textContent = '🔧 Нормальный ресурс'
			else if (hours > 500) resultLabel.textContent = '🔧 Средний ресурс'
			else if (hours > 200) resultLabel.textContent = '🔧 Небольшой ресурс'
			else resultLabel.textContent = '🔧 Двигатель почти новый'

			// Показываем доп. результаты
			if (cost !== null) {
				extraResults.style.display = 'flex'
				costValue.textContent = formatNumber(cost) + ' ₽'
				timeValue.textContent = '—'
			}

			if (saveHistoryFlag && currentUser) {
				addHistoryRecord(currentUser, {
					mode: 'hours',
					input1,
					input2,
					result,
					unit,
					cost: cost,
				})
				renderHistory(currentUser)
			}
		}

		resultContainer.classList.remove('error')
		resultContainer.classList.add('has-value')
		resultNumber.classList.add('animate')
		if (animationTimer) {
			clearTimeout(animationTimer)
		}
		animationTimer = setTimeout(() => {
			resultNumber.classList.remove('animate')
			animationTimer = null
		}, 450)

		// Сохраняем последние значения
		if (saveHistoryFlag) {
			saveLastValues()
		}
	}

	// ── Mode switch ──
	function setMode(mode) {
		currentMode = mode
		modeToggleBtns.forEach(b => {
			const active = b.dataset.mode === mode
			b.classList.toggle('active', active)
			b.setAttribute('aria-pressed', active ? 'true' : 'false')
		})
		if (mode === 'range') {
			rangeInputs.style.display = 'flex'
			hoursInputs.style.display = 'none'
			modeIcon.textContent = '🚗'
			modeTitle.textContent = 'Запас хода'
			modeDesc.textContent = 'Введите топливо и расход'
			document.querySelector('.unit-toggle').style.display = 'flex'
		} else {
			rangeInputs.style.display = 'none'
			hoursInputs.style.display = 'flex'
			modeIcon.textContent = '⏱️'
			modeTitle.textContent = 'Моточасы'
			modeDesc.textContent = 'Введите пробег и среднюю скорость'
			document.querySelector('.unit-toggle').style.display = 'none'
		}
		calculate(false)
	}

	function setUnit(unit) {
		currentUnit = unit
		toggleBtns.forEach(b => {
			const active = b.dataset.unit === unit
			b.classList.toggle('active', active)
			b.setAttribute('aria-pressed', active ? 'true' : 'false')
		})
		if (unit === 'metric') {
			fuelUnit.textContent = 'л'
			consumptionUnit.textContent = 'л/100 км'
			priceUnit.textContent = '₽/л'
			fuelInput.placeholder = 'литры'
			consumptionInput.placeholder = 'л/100 км'
			resultUnit.textContent = 'км'
		} else {
			fuelUnit.textContent = 'гал'
			consumptionUnit.textContent = 'миль/гал'
			priceUnit.textContent = '₽/гал'
			fuelInput.placeholder = 'галлоны'
			consumptionInput.placeholder = 'миль/гал'
			resultUnit.textContent = 'миль'
		}
		if (currentMode === 'range') calculate(false)
	}

	// ── Auth ──
	function getUsers() {
		try {
			return JSON.parse(localStorage.getItem('fuelUsers')) || []
		} catch {
			return []
		}
	}
	function saveUsers(u) {
		localStorage.setItem('fuelUsers', JSON.stringify(u))
	}
	function getCurrentUser() {
		return localStorage.getItem('fuelCurrentUser') || null
	}
	function setCurrentUser(login) {
		login
			? localStorage.setItem('fuelCurrentUser', login)
			: localStorage.removeItem('fuelCurrentUser')
	}

	function updateUI() {
		const user = getCurrentUser()
		if (user) {
			authButtons.style.display = 'none'
			userInfo.style.display = 'flex'
			userNameDisplay.textContent = user
			currentUser = user
			userProfile.style.display = 'block'
			noAuthMessage.style.display = 'none'
			profileLogin.textContent = user
			const users = getUsers()
			const found = users.find(u => u.login === user)
			profilePassword.textContent = found ? found.password : '—'
			renderHistory(user)
		} else {
			authButtons.style.display = 'flex'
			userInfo.style.display = 'none'
			currentUser = null
			userProfile.style.display = 'none'
			noAuthMessage.style.display = 'block'
			historyList.innerHTML = '<div class="history-empty">Нет записей</div>'
			// Clear charts
			rangeChartCanvas.style.display = 'none'
			rangeChartEmpty.classList.add('show')
			hoursChartCanvas.style.display = 'none'
			hoursChartEmpty.classList.add('show')
			costChartCanvas.style.display = 'none'
			costChartEmpty.classList.add('show')
			if (rangeChartInstance) {
				rangeChartInstance.destroy()
				rangeChartInstance = null
			}
			if (hoursChartInstance) {
				hoursChartInstance.destroy()
				hoursChartInstance = null
			}
			if (costChartInstance) {
				costChartInstance.destroy()
				costChartInstance = null
			}
		}
	}

	function register(login, password, confirm) {
		if (!login || !password || !confirm) {
			alert('Заполните все поля')
			return false
		}
		if (password !== confirm) {
			alert('Пароли не совпадают')
			return false
		}
		if (password.length < 4) {
			alert('Пароль минимум 4 символа')
			return false
		}
		const users = getUsers()
		if (users.find(u => u.login === login)) {
			alert('Логин уже занят')
			return false
		}
		users.push({ login, password })
		saveUsers(users)
		alert('Регистрация успешна! Теперь войдите.')
		return true
	}

	function login(login, password) {
		if (!login || !password) {
			alert('Введите логин и пароль')
			return false
		}
		const users = getUsers()
		const user = users.find(u => u.login === login)
		if (!user) {
			alert('Пользователь не найден')
			return false
		}
		if (user.password !== password) {
			alert('Неверный пароль')
			return false
		}
		setCurrentUser(login)
		updateUI()
		closeAllModals()
		alert(`Добро пожаловать, ${login}!`)
		return true
	}

	function logout() {
		setCurrentUser(null)
		updateUI()
		alert('Вы вышли')
	}
	function openModal(m) {
		m.classList.add('active')
	}
	function closeModal(m) {
		m.classList.remove('active')
	}
	function closeAllModals() {
		closeModal(loginModal)
		closeModal(registerModal)
		closeModal(document.getElementById('oilModal'))
	}

	// ── Event listeners ──
	calculateBtn.addEventListener('click', () => calculate(true))

	;[
		fuelInput,
		consumptionInput,
		mileageInput,
		avgSpeedInput,
		fuelPrice,
		travelSpeed,
		hourlyRate,
	].forEach(el => {
		el.addEventListener('keydown', e => {
			if (e.key === 'Enter') {
				e.preventDefault()
				calculateBtn.click()
			}
		})
	})

	// Пресеты для range
	document.querySelectorAll('[data-fuel]').forEach(b =>
		b.addEventListener('click', e => {
			e.stopPropagation()
			fuelInput.value = b.dataset.fuel
		}),
	)
	document.querySelectorAll('[data-consumption]').forEach(b =>
		b.addEventListener('click', e => {
			e.stopPropagation()
			consumptionInput.value = b.dataset.consumption
		}),
	)
	document.querySelectorAll('[data-price]').forEach(b =>
		b.addEventListener('click', e => {
			e.stopPropagation()
			fuelPrice.value = b.dataset.price
		}),
	)
	document.querySelectorAll('[data-speed-travel]').forEach(b =>
		b.addEventListener('click', e => {
			e.stopPropagation()
			travelSpeed.value = b.dataset.speedTravel
		}),
	)

	// Пресеты для hours
	document.querySelectorAll('[data-mileage]').forEach(b =>
		b.addEventListener('click', e => {
			e.stopPropagation()
			mileageInput.value = b.dataset.mileage
		}),
	)
	document.querySelectorAll('[data-speed]').forEach(b =>
		b.addEventListener('click', e => {
			e.stopPropagation()
			avgSpeedInput.value = b.dataset.speed
		}),
	)
	document.querySelectorAll('[data-hourly]').forEach(b =>
		b.addEventListener('click', e => {
			e.stopPropagation()
			hourlyRate.value = b.dataset.hourly
		}),
	)

	modeToggleBtns.forEach(b =>
		b.addEventListener('click', function () {
			if (this.dataset.mode !== currentMode) setMode(this.dataset.mode)
		}),
	)
	toggleBtns.forEach(b =>
		b.addEventListener('click', function () {
			if (this.dataset.unit !== currentUnit) setUnit(this.dataset.unit)
		}),
	)

	themeToggle.addEventListener('click', toggleTheme)

	// Экспорт
	document.getElementById('exportCSV').addEventListener('click', exportCSV)
	document.getElementById('exportJSON').addEventListener('click', exportJSON)

	// Модалки
	loginBtn.addEventListener('click', () => openModal(loginModal))
	registerBtn.addEventListener('click', () => openModal(registerModal))
	closeLogin.addEventListener('click', () => closeModal(loginModal))
	closeRegister.addEventListener('click', () => closeModal(registerModal))
	window.addEventListener('click', e => {
		if (e.target === loginModal) closeModal(loginModal)
		if (e.target === registerModal) closeModal(registerModal)
		if (e.target === document.getElementById('oilModal'))
			closeModal(document.getElementById('oilModal'))
	})
	switchToRegister.addEventListener('click', e => {
		e.preventDefault()
		closeModal(loginModal)
		openModal(registerModal)
	})
	switchToLogin.addEventListener('click', e => {
		e.preventDefault()
		closeModal(registerModal)
		openModal(loginModal)
	})

	loginForm.addEventListener('submit', e => {
		e.preventDefault()
		const l = document.getElementById('loginUsername').value.trim()
		const p = document.getElementById('loginPassword').value.trim()
		if (login(l, p)) loginForm.reset()
	})
	registerForm.addEventListener('submit', e => {
		e.preventDefault()
		const l = document.getElementById('regUsername').value.trim()
		const p = document.getElementById('regPassword').value.trim()
		const c = document.getElementById('regPasswordConfirm').value.trim()
		if (register(l, p, c)) {
			registerForm.reset()
			closeModal(registerModal)
			openModal(loginModal)
		}
	})
	logoutBtn.addEventListener('click', logout)

	// ── Масляный калькулятор ──
	const oilModal = document.getElementById('oilModal')
	const oilModalBtn = document.getElementById('oilModalBtn')
	const closeOil = document.getElementById('closeOil')
	const oilPrevMileage = document.getElementById('oilPrevMileage')
	const oilCurrentMileage = document.getElementById('oilCurrentMileage')
	const oilSpeed = document.getElementById('oilSpeed')
	const oilLimit = document.getElementById('oilLimit')
	const oilCalculateBtn = document.getElementById('oilCalculateBtn')
	const oilResultNumber = document.getElementById('oilResultNumber')
	const oilResultUnit = document.getElementById('oilResultUnit')
	const oilResultLabel = document.getElementById('oilResultLabel')
	const oilResultSub = document.getElementById('oilResultSub')
	const oilResultStatus = document.getElementById('oilResultStatus')
	const oilResultContainer = document.getElementById('oilResultContainer')

	function calculateOilChange() {
		const prevMileage = getSafeNumber(oilPrevMileage.value)
		const currentMileage = getSafeNumber(oilCurrentMileage.value)
		const speed = getSafeNumber(oilSpeed.value)
		const limit = getSafeNumber(oilLimit.value) || 250

		oilResultNumber.classList.remove('animate')

		if (prevMileage > currentMileage) {
			oilResultContainer.classList.remove('has-value')
			oilResultNumber.textContent = '⚠️'
			oilResultNumber.classList.add('animate')
			oilResultUnit.textContent = ''
			oilResultLabel.textContent = 'Ошибка: пробег при замене больше текущего'
			oilResultSub.textContent = 'Проверьте введённые данные'
			oilResultStatus.className = 'oil-result-status'
			oilResultStatus.style.display = 'none'
			return
		}

		if (currentMileage === 0) {
			oilResultContainer.classList.remove('has-value')
			oilResultNumber.textContent = '0'
			oilResultNumber.classList.add('animate')
			oilResultUnit.textContent = 'км'
			oilResultLabel.textContent = '🛣️ Укажите текущий пробег'
			oilResultSub.textContent = ''
			oilResultStatus.className = 'oil-result-status'
			oilResultStatus.style.display = 'none'
			return
		}
		if (speed <= 0) {
			oilResultContainer.classList.remove('has-value')
			oilResultNumber.textContent = '?'
			oilResultNumber.classList.add('animate')
			oilResultUnit.textContent = ''
			oilResultLabel.textContent = '⚠️ Укажите среднюю скорость'
			oilResultSub.textContent = ''
			oilResultStatus.className = 'oil-result-status'
			oilResultStatus.style.display = 'none'
			return
		}

		const mileageSinceChange = currentMileage - prevMileage
		const currentHours = mileageSinceChange / speed
		const remainingHours = Math.max(0, limit - currentHours)
		const remainingMileage = remainingHours * speed
		const recommendedMileage = currentMileage + remainingMileage

		oilResultContainer.classList.add('has-value')
		oilResultNumber.textContent = formatNumber(remainingMileage)
		oilResultNumber.classList.add('animate')
		oilResultUnit.textContent = 'км'
		oilResultSub.innerHTML = `📊 С момента замены: ${formatNumber(mileageSinceChange)} км · ${formatNumber(currentHours)} мч<br>🔄 Рекомендуемая замена: ${formatNumber(recommendedMileage)} км`

		if (currentHours >= limit) {
			oilResultLabel.textContent = '🔴 СРОЧНАЯ ЗАМЕНА МАСЛА!'
			oilResultStatus.textContent = `⚠️ Масло нужно менять СРОЧНО! Пробег с замены ${formatNumber(mileageSinceChange)} км превысил норму`
			oilResultStatus.className = 'oil-result-status urgent'
			oilResultStatus.style.display = 'inline-block'
		} else if (currentHours >= limit * 0.8) {
			oilResultLabel.textContent = '🟡 Скоро потребуется замена масла'
			oilResultStatus.textContent = `⏰ Осталось ~${formatNumber(remainingHours)} мч (${formatNumber(remainingMileage)} км)`
			oilResultStatus.className = 'oil-result-status warning'
			oilResultStatus.style.display = 'inline-block'
		} else if (currentHours >= limit * 0.5) {
			oilResultLabel.textContent = '🟢 Масло в хорошем состоянии'
			oilResultStatus.textContent = `✅ До замены ~${formatNumber(remainingHours)} мч (${formatNumber(remainingMileage)} км)`
			oilResultStatus.className = 'oil-result-status success'
			oilResultStatus.style.display = 'inline-block'
		} else {
			oilResultLabel.textContent = '🟢 Масло в отличном состоянии'
			oilResultStatus.textContent = `✅ До замены ~${formatNumber(remainingHours)} мч (${formatNumber(remainingMileage)} км)`
			oilResultStatus.className = 'oil-result-status success'
			oilResultStatus.style.display = 'inline-block'
		}

		setTimeout(() => {
			oilResultNumber.classList.remove('animate')
		}, 450)
	}

	// Обработчики масляного калькулятора
	oilModalBtn.addEventListener('click', () => openModal(oilModal))
	closeOil.addEventListener('click', () => closeModal(oilModal))
	window.addEventListener('click', e => {
		if (e.target === oilModal) closeModal(oilModal)
	})

	oilCalculateBtn.addEventListener('click', calculateOilChange)

	;[oilPrevMileage, oilCurrentMileage, oilSpeed, oilLimit].forEach(el => {
		el.addEventListener('keydown', e => {
			if (e.key === 'Enter') {
				e.preventDefault()
				oilCalculateBtn.click()
			}
		})
	})

	// Пресеты масляного калькулятора
	document.querySelectorAll('[data-oil-prev]').forEach(b => {
		b.addEventListener('click', e => {
			e.stopPropagation()
			oilPrevMileage.value = b.dataset.oilPrev
		})
	})
	document.querySelectorAll('[data-oil-current]').forEach(b => {
		b.addEventListener('click', e => {
			e.stopPropagation()
			oilCurrentMileage.value = b.dataset.oilCurrent
		})
	})
	document.querySelectorAll('[data-oil-speed]').forEach(b => {
		b.addEventListener('click', e => {
			e.stopPropagation()
			oilSpeed.value = b.dataset.oilSpeed
		})
	})
	document.querySelectorAll('[data-oil-limit]').forEach(b => {
		b.addEventListener('click', e => {
			e.stopPropagation()
			oilLimit.value = b.dataset.oilLimit
		})
	})

	// ── Init ──
	setTheme(getTheme())
	loadLastValues()
	setUnit(currentUnit)
	setMode(currentMode)
	setTimeout(() => calculate(false), 100)
	updateUI()
})()
