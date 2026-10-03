const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');

const initializePageInteractions = () => {
    document.documentElement.classList.add('js-ready');

    const progressBar = document.querySelector('[data-scroll-progress]');
    const updateProgress = () => {
        if (!progressBar) return;
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        progressBar.style.transform = `scaleX(${scrollable > 0 ? window.scrollY / scrollable : 0})`;
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();

    const revealItems = document.querySelectorAll('main > section, .detail-layout > *, .document-viewer, .document-card, .insight-card, .lens-card, .brief-items article');
    revealItems.forEach((item, index) => {
        item.dataset.reveal = '';
        item.style.setProperty('--reveal-delay', `${Math.min(index % 5, 4) * 65}ms`);
    });
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries, currentObserver) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                currentObserver.unobserve(entry.target);
            });
        }, { threshold: 0.12 });
        revealItems.forEach((item) => observer.observe(item));
    } else {
        revealItems.forEach((item) => item.classList.add('is-visible'));
    }

    document.querySelectorAll('.stats-item strong, .dashboard-kpis strong').forEach((counter) => {
        const finalText = counter.textContent.trim();
        const numericValue = Number(finalText.replace(/[^0-9]/g, ''));
        if (!numericValue || counter.dataset.counted) return;
        counter.dataset.counted = 'true';
        const startedAt = performance.now();
        const tick = (now) => {
            const progress = Math.min((now - startedAt) / 850, 1);
            const current = Math.round(numericValue * (1 - Math.pow(1 - progress, 3)));
            counter.textContent = current.toLocaleString('es-CO');
            if (progress < 1) window.requestAnimationFrame(tick);
            else counter.textContent = finalText;
        };
        window.requestAnimationFrame(tick);
    });

    const currentPath = window.location.pathname;
    document.querySelectorAll('[data-nav-key]').forEach((link) => {
        const isCurrent = (link.dataset.navKey === 'dashboard' && currentPath.includes('/dashboard/'))
            || (link.dataset.navKey === 'methodology' && currentPath.includes('/metodologia/'))
            || (link.dataset.navKey === 'territory' && (currentPath.includes('/territorio/') || currentPath.includes('/mapa/')));
        link.classList.toggle('is-current', isCurrent);
    });
};

const initializeGlossary = () => {
    const search = document.querySelector('[data-glossary-search]');
    const families = [...document.querySelectorAll('[data-glossary-family]')];
    const filters = [...document.querySelectorAll('[data-glossary-filter]')];
    const count = document.querySelector('[data-glossary-count]');
    if (!search || !families.length) return;
    let activeFilter = 'all';
    const applyFilters = () => {
        const query = search.value.trim().toLowerCase();
        let visibleTerms = 0;
        families.forEach((family) => {
            const matchesFamily = activeFilter === 'all' || family.dataset.glossaryFamily === activeFilter;
            const terms = [...family.querySelectorAll('.glossary-terms p')];
            let familyMatches = false;
            terms.forEach((term) => {
                const matchesQuery = !query || term.textContent.toLowerCase().includes(query);
                term.hidden = !matchesQuery;
                if (matchesQuery) {
                    familyMatches = true;
                    visibleTerms += 1;
                }
            });
            family.hidden = !matchesFamily || !familyMatches;
            if (query && matchesFamily && familyMatches) family.open = true;
        });
        if (count) count.textContent = query ? `${visibleTerms} términos encontrados` : '36 categorías de armas y medios · 13 conceptos metodológicos';
    };
    search.addEventListener('input', applyFilters);
    filters.forEach((filter) => filter.addEventListener('click', () => {
        activeFilter = filter.dataset.glossaryFilter;
        filters.forEach((item) => item.classList.toggle('is-active', item === filter));
        applyFilters();
    }));
};

const initializeQrContact = () => {
    // El fallback al QR estático está gestionado por el atributo onerror del <img> en el template.
    // Esta función se mantiene por compatibilidad pero ya no necesita lógica adicional.
};

const initializeChat = () => {
    const widget = document.querySelector('[data-chat-widget]');
    if (!widget) {
        return;
    }
    const launcher = widget.querySelector('.chat-launcher');
    const panel = widget.querySelector('.chat-panel');
    const closeButton = widget.querySelector('.chat-close');
    const form = widget.querySelector('[data-chat-form]');
    const freeForm = widget.querySelector('[data-chat-free-form]');
    const freeQuestion = widget.querySelector('[data-chat-free-question]');
    const dictateButton = widget.querySelector('[data-chat-dictate]');
    const freeSubmitButton = freeForm.querySelector('[type="submit"]');
    const categorySelect = form.querySelector('[data-chat-category]');
    const questionSelect = form.querySelector('[data-chat-question]');
    const messages = widget.querySelector('[data-chat-messages]');
    const csrfToken = form.querySelector('[name=csrfmiddlewaretoken]').value;
    const categoryList = widget.querySelector('[data-chat-categories]');
    const questionList = widget.querySelector('[data-chat-questions]');
    const quickSuggestions = widget.querySelector('[data-chat-suggestions]');
    const progress = widget.querySelector('[data-chat-progress]');
    const backButton = widget.querySelector('[data-chat-back]');
    const voiceToggle = widget.querySelector('[data-chat-voice-toggle]');
    const voiceStatus = widget.querySelector('[data-chat-voice-status]');
    const speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let readAnswersAloud = false;
    let activeSpeechButton = null;
    let activeUtterance = null;

    const stopSpeaking = () => {
        const previousButton = activeSpeechButton;
        activeSpeechButton = null;
        activeUtterance = null;
        if (speechSupported) window.speechSynthesis.cancel();
        if (previousButton) {
            previousButton.textContent = '▶ Escuchar respuesta';
            previousButton.setAttribute('aria-label', 'Escuchar respuesta');
        }
    };
    const speakAnswer = (text, button = null) => {
        if (!speechSupported) {
            voiceStatus.textContent = 'La lectura en voz alta no está disponible en este navegador.';
            return;
        }
        stopSpeaking();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-CO';
        const spanishVoices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith('es'));
        utterance.voice = spanishVoices.find((voice) => voice.lang.toLowerCase() === 'es-co')
            || spanishVoices.find((voice) => voice.lang.toLowerCase() === 'es-es')
            || spanishVoices[0]
            || null;
        if (button) {
            activeSpeechButton = button;
            button.textContent = '■ Detener voz';
            button.setAttribute('aria-label', 'Detener lectura de la respuesta');
        }
        activeUtterance = utterance;
        utterance.onend = () => {
            if (activeUtterance === utterance) stopSpeaking();
        };
        utterance.onerror = () => {
            if (activeUtterance !== utterance) return;
            stopSpeaking();
            voiceStatus.textContent = 'No se pudo reproducir la voz. Puedes intentarlo nuevamente.';
        };
        window.speechSynthesis.speak(utterance);
    };
    if (!speechSupported) {
        voiceToggle.disabled = true;
        voiceToggle.title = 'La lectura en voz alta no está disponible en este navegador';
    }
    if (!SpeechRecognition) {
        dictateButton.disabled = true;
        dictateButton.title = 'El dictado por voz no está disponible en este navegador';
    }
    voiceToggle.addEventListener('click', () => {
        readAnswersAloud = !readAnswersAloud;
        voiceToggle.setAttribute('aria-pressed', String(readAnswersAloud));
        voiceToggle.classList.toggle('is-active', readAnswersAloud);
        voiceToggle.textContent = readAnswersAloud ? '🔊 Lectura activada' : '🔊 Lectura automática';
        voiceStatus.textContent = readAnswersAloud
            ? 'La lectura automática está activada.'
            : 'La lectura automática está desactivada.';
        if (!readAnswersAloud) stopSpeaking();
    });

    const setOpen = (isOpen) => {
        if (!isOpen) stopSpeaking();
        panel.hidden = !isOpen;
        widget.classList.toggle('is-open', isOpen);
        launcher.setAttribute('aria-expanded', String(isOpen));
        launcher.title = isOpen ? 'Ocultar asistente del proyecto' : 'Mostrar asistente del proyecto';
        if (isOpen) {
            freeQuestion.focus();
        }
    };
    const escapeHtml = (text) => text.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
    const formatAssistantText = (text) => escapeHtml(text)
        .replace(/^[-*] (.+)$/gm, '<span class="chat-list-item">$1</span>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    const addMessage = (text, role, sources = []) => {
        const message = document.createElement('div');
        message.className = `chat-message ${role.split(' ').map((item) => `chat-message-${item}`).join(' ')}`;
        if (role.split(' ').includes('assistant')) {
            message.innerHTML = formatAssistantText(text);
        } else {
            message.textContent = text;
        }
        if (role.split(' ').includes('assistant') && !message.classList.contains('chat-message-pending')) {
            const speakButton = document.createElement('button');
            speakButton.type = 'button';
            speakButton.className = 'chat-message-speak';
            speakButton.textContent = '▶ Escuchar respuesta';
            speakButton.setAttribute('aria-label', 'Escuchar respuesta');
            speakButton.addEventListener('click', () => {
                if (activeSpeechButton === speakButton) {
                    stopSpeaking();
                    return;
                }
                speakAnswer(text, speakButton);
            });
            message.appendChild(speakButton);
            if (readAnswersAloud) speakAnswer(text, speakButton);
        }
        if (sources.length) {
            const sourceNote = document.createElement('small');
            sourceNote.className = 'chat-sources';
            sourceNote.append('Fuentes: ');
            sources.forEach((source, index) => {
                if (index) sourceNote.append(' · ');
                if (typeof source === 'string') {
                    sourceNote.append(source);
                    return;
                }
                const label = [source.title, source.reference].filter(Boolean).join(' — ');
                if (source.url) {
                    const link = document.createElement('a');
                    link.href = source.url;
                    link.textContent = label;
                    sourceNote.append(link);
                } else {
                    sourceNote.append(label);
                }
            });
            message.appendChild(sourceNote);
        }
        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
        return message;
    };

    const makeChoice = (label, value, className = '') => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `chat-choice ${className}`;
        button.dataset.value = value;
        button.textContent = label;
        return button;
    };
    const resetChatSession = () => {
        messages.replaceChildren();
        addMessage('Escribe o dicta una pregunta sobre el proyecto. También puedes elegir uno de los temas sugeridos. Las respuestas se buscan en documentos publicados y datos del dashboard.', 'assistant');
        progress.textContent = 'Paso 1 de 2 · Elige un tema';
        categorySelect.value = '';
        questionSelect.value = '';
        categorySelect.disabled = false;
        questionSelect.disabled = true;
        categoryList.hidden = false;
        questionList.hidden = true;
        backButton.hidden = true;
        backButton.textContent = '← Cambiar de tema';
        quickSuggestions.hidden = false;
    };
    const renderCategories = (categories) => {
        categoryList.replaceChildren();
        categories.forEach((category) => {
            const button = makeChoice(category.label, category.id, 'chat-category-choice');
            button.title = category.description;
            button.addEventListener('click', () => {
                categorySelect.value = category.id;
                updateQuestions();
            });
            categoryList.appendChild(button);
        });
    };
    const renderQuickSuggestions = (quickQuestions = []) => {
        quickSuggestions.replaceChildren();
        quickQuestions.forEach((question) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = question.label;
            button.title = `Consultar: ${question.label}`;
            button.addEventListener('click', () => {
                const category = categorySelect._categories?.find((item) => item.id === question.category);
                if (!category) return;
                categorySelect.value = category.id;
                updateQuestions();
                const targetQuestion = category.questions.find((item) => item.id === question.id);
                if (!targetQuestion) return;
                questionSelect.value = targetQuestion.id;
                categoryList.hidden = true;
                questionList.hidden = true;
                backButton.hidden = false;
                backButton.textContent = '← Cambiar de tema';
                progress.textContent = 'Respuesta · Pregunta rápida';
                form.requestSubmit();
            });
            quickSuggestions.appendChild(button);
        });
    };
    const loadQuestionBank = async () => {
        try {
            const response = await fetch('/api/chat/');
            const result = await response.json();
            categorySelect.innerHTML = '<option value="">Selecciona un tema</option>' + result.categories.map((category) => `<option value="${category.id}">${category.label}</option>`).join('');
            categorySelect._categories = result.categories;
            renderCategories(result.categories);
            renderQuickSuggestions(result.quick_questions || []);
        } catch (error) {
            categoryList.textContent = 'No se pudieron cargar los temas.';
            quickSuggestions.textContent = 'No se pudieron cargar las preguntas rápidas.';
        }
    };
    const updateQuestions = () => {
        const category = (categorySelect._categories || []).find((item) => item.id === categorySelect.value);
        questionSelect.disabled = !category;
        questionSelect.innerHTML = category ? '<option value="">Selecciona una pregunta</option>' + category.questions.map((question) => `<option value="${question.id}">${question.label}</option>`).join('') : '<option value="">Elige primero un tema</option>';
        if (!category) {
            questionList.hidden = true;
            categoryList.hidden = false;
            backButton.hidden = true;
            progress.textContent = 'Paso 1 de 2 · Elige un tema';
            return;
        }
        categoryList.hidden = true;
        questionList.hidden = false;
        backButton.hidden = false;
        progress.textContent = `Paso 2 de 2 · ${category.label}`;
        questionList.replaceChildren();
        category.questions.forEach((question) => {
            const button = makeChoice(question.label, question.id, 'chat-question-choice');
            button.addEventListener('click', () => {
                questionSelect.value = question.id;
                categoryList.hidden = true;
                questionList.hidden = true;
                backButton.textContent = '＋ Otra pregunta';
                progress.textContent = 'Respuesta · Puedes elegir otra pregunta';
                form.requestSubmit();
            });
            questionList.appendChild(button);
        });
    };

    let questionBankLoaded = false;
    const ensureQuestionBank = async () => {
        if (questionBankLoaded) return;
        questionBankLoaded = true;
        await loadQuestionBank();
    };

    launcher.addEventListener('click', () => {
        const willOpen = panel.hidden;
        if (willOpen) {
            resetChatSession();
            ensureQuestionBank();
        }
        setOpen(willOpen);
    });
    closeButton.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !panel.hidden) setOpen(false);
    });
    document.addEventListener('click', (event) => {
        if (!panel.hidden && !widget.contains(event.target)) setOpen(false);
    });
    categorySelect.addEventListener('change', updateQuestions);
    backButton.addEventListener('click', () => {
        if (questionList.hidden && categorySelect.value) {
            categoryList.hidden = true;
            questionList.hidden = false;
            backButton.textContent = '← Cambiar de tema';
            progress.textContent = `Paso 2 de 2 · ${categorySelect.options[categorySelect.selectedIndex].text}`;
            questionList.querySelector('button')?.focus();
            return;
        }
        categorySelect.value = '';
        updateQuestions();
        categoryList.querySelector('button')?.focus();
    });
    resetChatSession();
    freeForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const query = freeQuestion.value.trim();
        if (!query) return;
        addMessage(query, 'user');
        freeQuestion.value = '';
        freeQuestion.disabled = true;
        freeSubmitButton.disabled = true;
        dictateButton.disabled = true;
        const pending = addMessage('Buscando en los documentos del proyecto…', 'assistant pending');
        try {
            const response = await fetch('/api/chat/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                body: JSON.stringify({ query }),
            });
            const result = await response.json();
            pending.remove();
            if (!response.ok) throw new Error(result.error || 'No pude procesar la pregunta.');
            addMessage(result.answer || 'No recibí una respuesta válida.', 'assistant', result.sources || []);
            progress.textContent = 'Pregunta abierta · Puedes continuar';
        } catch (error) {
            pending.remove();
            addMessage(error.message || 'No pude conectar con el asistente. Inténtalo de nuevo.', 'error');
        } finally {
            freeQuestion.disabled = false;
            freeSubmitButton.disabled = false;
            dictateButton.disabled = !SpeechRecognition;
            freeQuestion.focus();
        }
    });
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-CO';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onstart = () => {
            dictateButton.classList.add('is-listening');
            dictateButton.setAttribute('aria-pressed', 'true');
            voiceStatus.textContent = 'El dictado se procesa según la configuración de voz de tu navegador. Te escucho.';
        };
        recognition.onresult = (event) => {
            freeQuestion.value = event.results[0][0].transcript.trim();
            freeForm.requestSubmit();
        };
        recognition.onerror = (event) => {
            voiceStatus.textContent = event.error === 'not-allowed'
                ? 'Permite el acceso al micrófono en el navegador para usar el dictado.'
                : 'No se pudo reconocer la voz. Puedes escribir la pregunta.';
        };
        recognition.onend = () => {
            dictateButton.classList.remove('is-listening');
            dictateButton.setAttribute('aria-pressed', 'false');
        };
        dictateButton.addEventListener('click', () => {
            try {
                recognition.start();
            } catch (error) {
                voiceStatus.textContent = 'El micrófono ya está activo. Termina de hablar o intenta nuevamente.';
            }
        });
    }
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!categorySelect.value || !questionSelect.value) return;
        const category = categorySelect.options[categorySelect.selectedIndex].text;
        const question = questionSelect.options[questionSelect.selectedIndex].text;
        addMessage(`${category}: ${question}`, 'user');
        categorySelect.disabled = true;
        questionSelect.disabled = true;
        const pending = addMessage('Consultando la respuesta…', 'assistant pending');
        try {
            const response = await fetch('/api/chat/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
                body: JSON.stringify({ category: categorySelect.value, question: questionSelect.value }),
            });
            const result = await response.json();
            pending.remove();
            addMessage(result.answer || result.error || 'No recibí una respuesta válida.', result.answer ? 'assistant' : 'error', result.sources || []);
            if (result.notice) addMessage(result.notice, 'notice');
            window.requestAnimationFrame(() => {
                messages.scrollTop = messages.scrollHeight;
            });
        } catch (error) {
            pending.remove();
            addMessage(error.name === 'AbortError' ? 'La respuesta está tardando demasiado. Intenta nuevamente.' : 'No pude conectar con el asistente. Inténtalo de nuevo.', 'error');
        } finally {
            categorySelect.disabled = false;
            questionSelect.disabled = !categorySelect.value;
            categorySelect.focus();
        }
    });
};

if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
        const isOpen = mainNav.classList.toggle('open');
        menuToggle.setAttribute('aria-expanded', String(isOpen));
        menuToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
    });

    mainNav.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            mainNav.classList.remove('open');
            menuToggle.setAttribute('aria-expanded', 'false');
            menuToggle.setAttribute('aria-label', 'Abrir menú');
        });
    });
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !mainNav.classList.contains('open')) return;
        mainNav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Abrir menú');
        menuToggle.focus();
    });
}

const initializeDashboard = async () => {
    const dashboardDataScript = document.getElementById('dashboard-data');
    const dashboardEndpoint = document.querySelector('[data-dashboard-endpoint]')?.dataset.dashboardEndpoint;
    if (!dashboardDataScript && !dashboardEndpoint) {
        return;
    }

    let dashboardRoot = document.querySelector('[data-dashboard-root]');
    if (!dashboardRoot) {
        const legacyToggle = document.querySelector('.dashboard-toggle');
        if (!legacyToggle) {
            return;
        }

        dashboardRoot = document.createElement('div');
        dashboardRoot.className = 'interactive-dashboard';
        dashboardRoot.setAttribute('data-dashboard-root', 'true');
        dashboardRoot.innerHTML = `
            <div class="dashboard-controls">
                <label><span>Año</span><select id="dashboard-year"><option value="Todos">Todos</option></select></label>
                <label><span>Región</span><select id="dashboard-region"><option value="Todos">Todos</option></select></label>
                <label><span>Genero</span><select id="dashboard-gender"><option value="Todos">Todos</option></select></label>
                <label><span>Grupo de edad</span><select id="dashboard-age"><option value="Todos">Todos</option></select></label>
            </div>
            <div class="dashboard-kpis">
                <div><span>Total víctimas</span><strong id="kpi-total">0</strong></div>
                <div><span>Año con más casos</span><strong id="kpi-top-year">-</strong></div>
                <div><span>Municipios</span><strong id="kpi-municipios">0</strong></div>
            </div>
            <div class="dashboard-grid">
                <article class="dashboard-chart-panel"><h3>Tendencia anual</h3><canvas id="annual-chart"></canvas></article>
                <article class="dashboard-chart-panel"><h3>Distribución regional</h3><canvas id="regions-chart"></canvas></article>
                <article class="dashboard-chart-panel"><h3>Género</h3><canvas id="gender-chart"></canvas></article>
                <article class="dashboard-chart-panel"><h3>Medios empleados</h3><canvas id="weapons-chart"></canvas></article>
                <article class="dashboard-chart-panel"><h3>Grupos de edad</h3><canvas id="ages-chart"></canvas></article>
            </div>
        `;
        legacyToggle.insertAdjacentElement('afterend', dashboardRoot);
        legacyToggle.style.display = 'none';
    }

    let dashboardData;
    if (dashboardDataScript) {
        dashboardData = JSON.parse(dashboardDataScript.textContent);
    } else {
        try {
            const response = await fetch(dashboardEndpoint);
            if (!response.ok) throw new Error('No se pudieron cargar los datos');
            dashboardData = await response.json();
        } catch (error) {
            dashboardRoot.insertAdjacentHTML('beforeend', '<p class="dashboard-load-error">No se pudieron cargar los datos del dashboard. Recarga la página para intentarlo de nuevo.</p>');
            return;
        }
    }
    const queryState = new URLSearchParams(window.location.search);
    const state = {
        year: queryState.get('year') || 'Todos',
        region: queryState.get('region') || 'Todos',
        gender: queryState.get('gender') || 'Todos',
        age: queryState.get('age') || 'Todos',
    };

    const yearSelect = document.getElementById('dashboard-year');
    const regionSelect = document.getElementById('dashboard-region');
    const genderSelect = document.getElementById('dashboard-gender');
    const ageSelect = document.getElementById('dashboard-age');
    const filterStatus = document.getElementById('dashboard-filter-status');
    const resetButton = document.getElementById('dashboard-reset');
    const exportButton = document.getElementById('dashboard-export');
    const printButton = document.getElementById('dashboard-print');
    const presentationButton = document.getElementById('dashboard-present');
    const generateReportButton = document.getElementById('dashboard-generate-report');
    const reportPanel = document.getElementById('informe-generado');
    const reportText = document.getElementById('dashboard-report-text');
    const downloadReportButton = document.getElementById('dashboard-download-report');
    const downloadTextButton = document.getElementById('dashboard-download-text');
    const printReportButton = document.getElementById('dashboard-print-report');
    const reportCsrfToken = document.querySelector('#informe-generado [name=csrfmiddlewaretoken]')?.value;
    const copyLinkButton = document.getElementById('dashboard-copy-link');
    const copyStatus = document.getElementById('dashboard-copy-status');
    const historySection = document.getElementById('dashboard-history');
    const historyList = document.getElementById('dashboard-history-list');

    const buildOptions = (items, key) => ['Todos', ...new Set((items || []).map((item) => item[key]).filter(Boolean))];

    const setOptions = () => {
        const years = buildOptions(dashboardData.annual || [], 'label');
        const regions = buildOptions(dashboardData.regions || [], 'label');
        const genders = buildOptions(dashboardData.gender || [], 'label');
        const ages = buildOptions(dashboardData.ages || [], 'label');

        yearSelect.innerHTML = years.map((option) => `<option value="${option}">${option}</option>`).join('');
        regionSelect.innerHTML = regions.map((option) => `<option value="${option}">${option}</option>`).join('');
        genderSelect.innerHTML = genders.map((option) => `<option value="${option}">${option}</option>`).join('');
        ageSelect.innerHTML = ages.map((option) => `<option value="${option}">${option}</option>`).join('');

        yearSelect.value = state.year;
        regionSelect.value = state.region;
        genderSelect.value = state.gender;
        ageSelect.value = state.age;
        state.year = yearSelect.value || 'Todos';
        state.region = regionSelect.value || 'Todos';
        state.gender = genderSelect.value || 'Todos';
        state.age = ageSelect.value || 'Todos';
    };

    const parseMetric = (value) => {
        if (typeof value === 'number') {
            return value;
        }
        return Number(String(value || '0').replace(/[^0-9.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
    };

    const getFilteredSeries = (collection, filterValue) => {
        if (!Array.isArray(collection)) {
            return [];
        }
        const active = String(filterValue || '').trim();
        if (!active || active === 'Todos') {
            return collection;
        }
        return collection.filter((item) => String(item.label || '').toLowerCase() === active.toLowerCase());
    };

    const getKpiValue = (label) => {
        const match = (dashboardData.kpis || []).find((item) => String(item.label || '').toLowerCase() === label.toLowerCase());
        return match ? match.value : null;
    };

    const updateKpis = (annualData, regionData) => {
        const total      = annualData.reduce((sum, item) => sum + parseMetric(item.value), 0);
        const topYear    = annualData.reduce((winner, current) => parseMetric(current.value) > parseMetric(winner.value) ? current : winner, annualData[0] || { label: '-', value: 0 }).label || '-';
        const municipios = getKpiValue('Municipios') || '1.020';

        // Contador animado — cuenta desde el valor anterior hasta el nuevo en ~900 ms
        const animateCount = (el, target, isYear = false) => {
            if (!el) return;
            // Reiniciar animación CSS del flash
            el.style.animation = 'none';
            el.offsetHeight; // reflow
            el.style.animation = '';
            const fmt      = new Intl.NumberFormat('es-CO');
            const prev     = parseMetric(el.textContent) || 0;
            const start    = performance.now();
            const duration = 900;
            const step = (now) => {
                const p   = Math.min((now - start) / duration, 1);
                // easeOutExpo
                const ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
                const cur  = Math.round(prev + (target - prev) * ease);
                el.textContent = isYear ? String(cur) : fmt.format(cur);
                if (p < 1) requestAnimationFrame(step);
                else el.textContent = isYear ? String(target) : fmt.format(target);
            };
            requestAnimationFrame(step);
        };

        animateCount(document.getElementById('kpi-total'), total);
        animateCount(document.getElementById('kpi-top-year'), Number(String(topYear).replace('.', '')) || 0, true);
        animateCount(document.getElementById('kpi-municipios'), parseMetric(municipios));
    };

    const valueLabelsPlugin = {
        id: 'dashboardValueLabels',
        afterDatasetsDraw(chart) {
            const chartType = chart.config.type;
            if (chartType === 'doughnut') return;

            const context = chart.ctx;
            const formatter = new Intl.NumberFormat('es-CO');
            context.save();

            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                const total = dataset.data.reduce((sum, item) => sum + (Number(item) || 0), 0);
                meta.data.forEach((element, index) => {
                    const value = Number(dataset.data[index]);
                    if (!Number.isFinite(value) || value === 0) return;

                    const barTop = Math.min(element.y, element.base);
                    const x = element.x;
                    const y = barTop - 9;
                    if (y < 6) return;

                    const label = formatter.format(value);
                    const percentage = total ? `${(value / total * 100).toFixed(1).replace('.', ',')}%` : '0%';
                    context.font = '700 10px DM Sans, sans-serif';
                    const textWidth = Math.max(context.measureText(label).width, context.measureText(percentage).width);
                    const padX = 7, rectH = 27;
                    const rectW = textWidth + padX * 2;
                    const rx = x - rectW / 2;
                    const ry = Math.max(3, y - rectH / 2);

                    // Fondo oscuro con borde rojo sutil
                    context.beginPath();
                    context.roundRect(rx, ry, rectW, rectH, 5);
                    context.fillStyle = 'rgba(12, 20, 18, 0.88)';
                    context.fill();
                    context.strokeStyle = 'rgba(230, 57, 70, 0.50)';
                    context.lineWidth = 1;
                    context.stroke();

                    context.textAlign = 'center';
                    context.textBaseline = 'middle';
                    context.fillStyle = '#f1c0c4';  // rojo rosado — legible, no agresivo
                    context.fillText(label, x, ry + 9);
                    context.font = '600 9px DM Sans, sans-serif';
                    context.fillStyle = '#f4a261';
                    context.fillText(percentage, x, ry + 20);
                });
            });
            context.restore();
        }
    };

    const renderChart = (canvasId, type, labels, values, title) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !window.Chart) return;

        if (window.__dashboardCharts?.[canvasId]) {
            window.__dashboardCharts[canvasId].destroy();
        }
        if (!window.__dashboardCharts) window.__dashboardCharts = {};

        // Paleta psicológica para doughnut:
        // Género → azul frío (MASCULINO) / rosa cálido (FEMENINO) / gris neutro (NR)
        // Medios → escala rojo-naranja (todo daño físico, misma familia de urgencia)
        const PALETTE = [
            '#2d6a9f', // azul frío — MASCULINO / Contundentes
            '#e07a8f', // rosa cálido — FEMENINO / Sin armas
            '#6b7c7a', // gris neutro — NO REPORTADO / Arma blanca
            '#e63946', // rojo — daño severo / Arma de fuego
            '#f4a261', // naranja — peligro moderado
            '#e9c46a', // ámbar — alerta leve
            '#a8dadc', // teal suave — categoría residual
        ];

        const ctx2d = canvas.getContext('2d');
        const isLine     = type === 'line';
        const isDoughnut = type === 'doughnut';
        const isBar      = type === 'bar';

        /* ---- Gradiente área para línea ---- */
        const buildLineAreaGradient = () => {
            const h = canvas.offsetHeight || 260;
            const g = ctx2d.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0,   'rgba(201, 237, 87, 0.55)');
            g.addColorStop(0.5, 'rgba(201, 237, 87, 0.18)');
            g.addColorStop(1,   'rgba(201, 237, 87, 0.00)');
            return g;
        };

        /* ---- Gradiente vertical por barra (oscuro → color) ---- */
        const buildBarGradient = (color, chartArea) => {
            if (!chartArea) return color + 'cc';
            const g = ctx2d.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            g.addColorStop(0,   color + '55');
            g.addColorStop(0.6, color + 'bb');
            g.addColorStop(1,   color + 'ff');
            return g;
        };

        /* ---- Datasets ---- */
        let dataset;

        if (isLine) {
            dataset = {
                label: title,
                data: values,
                borderColor: '#c9ed57',
                backgroundColor: buildLineAreaGradient(),
                borderWidth: 3,
                pointBackgroundColor: '#c9ed57',
                pointBorderColor: '#17211f',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 9,
                pointHoverBackgroundColor: '#fff',
                fill: true,
                tension: 0.42,
            };
        } else if (isDoughnut) {
            dataset = {
                label: title,
                data: values,
                backgroundColor: PALETTE.map((c) => c + 'e0'),
                borderColor: '#17211f',
                borderWidth: 3,
                hoverOffset: 16,
                hoverBorderColor: '#fff',
                hoverBorderWidth: 2,
            };
        } else {
            // barras con gradiente — se recalcula en afterLayout
            dataset = {
                label: title,
                data: values,
                backgroundColor: (ctx) => {
                    const chart = ctx.chart;
                    const { chartArea } = chart;
                    if (!chartArea) return PALETTE[ctx.dataIndex % PALETTE.length] + 'aa';
                    return buildBarGradient(PALETTE[ctx.dataIndex % PALETTE.length], chartArea);
                },
                borderColor: values.map((_, i) => PALETTE[i % PALETTE.length]),
                borderWidth: 0,
                borderRadius: 7,
                borderSkipped: false,
            };
        }

        /* ---- Tooltip ---- */
        const formatter = new Intl.NumberFormat('es-CO');
        const tooltipConfig = {
            backgroundColor: 'rgba(10, 15, 14, 0.95)',
            titleColor: '#c9ed57',
            bodyColor: '#e8ede6',
            borderColor: 'rgba(201,237,87,0.35)',
            borderWidth: 1,
            padding: { x: 14, y: 10 },
            cornerRadius: 8,
            displayColors: true,
            boxWidth: 10,
            boxHeight: 10,
            boxPadding: 4,
            titleFont: { family: 'DM Sans', weight: '700', size: 12 },
            bodyFont:  { family: 'DM Sans', size: 12 },
            callbacks: {
                title: (items) => items[0]?.label || '',
                label: (ctx) => {
                    const val   = Number(isDoughnut ? ctx.parsed : ctx.parsed.y) || 0;
                    const total = ctx.dataset.data.reduce((s, v) => s + (Number(v) || 0), 0);
                    const pct   = total ? ` · ${((val / total) * 100).toFixed(1)}%` : '';
                    return `  ${formatter.format(val)}${isDoughnut ? pct : ''}`;
                },
            },
        };

        /* ---- Escalas ---- */
        const scalesConfig = isDoughnut ? { x: { display: false }, y: { display: false } } : {
            x: {
                grid: { display: false, drawBorder: false },
                border: { display: false },
                ticks: {
                    color: '#8fa89f',
                    font: { family: 'DM Sans', size: 11 },
                    maxRotation: isBar && labels.length > 7 ? 38 : 0,
                    maxTicksLimit: isBar && labels.length > 8 ? 8 : undefined,
                },
            },
            y: {
                beginAtZero: true,
                border: { display: false },
                grid: {
                    color: 'rgba(255,255,255,0.07)',
                    drawBorder: false,
                },
                ticks: {
                    color: '#8fa89f',
                    font: { family: 'DM Sans', size: 11 },
                    callback: (v) => new Intl.NumberFormat('es-CO', { notation: 'compact', compactDisplay: 'short' }).format(v),
                },
            },
        };

        window.__dashboardCharts[canvasId] = new Chart(canvas, {
            type,
            data: { labels, datasets: [dataset] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 650, easing: 'easeOutCubic' },
                layout: { padding: { top: isBar ? 28 : 8, bottom: 4, left: 2, right: 2 } },
                plugins: {
                    legend: { display: false },
                    tooltip: tooltipConfig,
                },
                scales: scalesConfig,
                ...(isDoughnut && { cutout: '65%' }),
            },
            plugins: isBar ? [valueLabelsPlugin] : (isDoughnut ? [doughnutCenterPlugin] : []),
        });
    };

    const renderLegend = (legendId, labels, values, maxItems = labels.length) => {
        const legend = document.getElementById(legendId);
        if (!legend) return;

        const PALETTE = [
            '#2d6a9f', // azul frío
            '#e07a8f', // rosa cálido
            '#6b7c7a', // gris neutro
            '#e63946', // rojo alerta
            '#f4a261', // naranja peligro
            '#e9c46a', // ámbar leve
            '#a8dadc', // teal residual
        ];
        const total = values.reduce((sum, value) => sum + parseMetric(value), 0);
        const formatter = new Intl.NumberFormat('es-CO');

        const rankedItems = labels
            .map((label, index) => ({ label, value: parseMetric(values[index]), colorIndex: index }))
            .sort((a, b) => b.value - a.value);

        const visibleItems = rankedItems.slice(0, maxItems);
        const hiddenCount = rankedItems.length - visibleItems.length;
        const maxValue = visibleItems[0]?.value || 1;

        const rows = visibleItems.map(({ label, value, colorIndex }) => {
            const pct = total ? (value / total * 100) : 0;
            const barWidth = maxValue ? Math.max(4, Math.round(value / maxValue * 100)) : 0;
            const color = PALETTE[colorIndex % PALETTE.length];
            return (
                '<li class="chart-legend-item">' +
                  '<span class="chart-legend-dot" style="background:' + color + '"></span>' +
                  '<span class="chart-legend-label">' + label + '</span>' +
                  '<span class="chart-legend-bar-wrap">' +
                    '<span class="chart-legend-bar" style="width:' + barWidth + '%;background:' + color + '22;border-left:3px solid ' + color + '"></span>' +
                  '</span>' +
                  '<span class="chart-legend-pct">' + pct.toFixed(1) + '%</span>' +
                  '<span class="chart-legend-val">' + formatter.format(value) + '</span>' +
                '</li>'
            );
        }).join('');

        const footer = hiddenCount > 0
            ? '<li class="chart-legend-more">+ ' + hiddenCount + ' categorías adicionales</li>'
            : '';

        legend.innerHTML = '<ul class="chart-legend-list">' + rows + footer + '</ul>';
    };

    // ─── Plugin: número central en doughnut ──────────────────────────────────
    const doughnutCenterPlugin = {
        id: 'doughnutCenter',
        afterDraw(chart) {
            if (chart.config.type !== 'doughnut') return;
            const { ctx, data, chartArea } = chart;
            if (!chartArea) return;
            const cx = (chartArea.left + chartArea.right) / 2;
            const cy = (chartArea.top  + chartArea.bottom) / 2;
            const total = (data.datasets[0]?.data || []).reduce((s, v) => s + (Number(v) || 0), 0);
            if (!total) return;
            const maxVal  = Math.max(...(data.datasets[0]?.data || []).map(Number));
            const maxIdx  = (data.datasets[0]?.data || []).findIndex((v) => Number(v) === maxVal);
            const maxLabel = (data.labels?.[maxIdx] || '').toString();
            const pct = ((maxVal / total) * 100).toFixed(1) + '%';
            ctx.save();
            // porcentaje dominante — grande
            ctx.font = 'bold 22px Space Grotesk, DM Sans, sans-serif';
            ctx.fillStyle = '#f1e0d0';   // marfil cálido — legible sobre ambas paletas
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pct, cx, cy - 10);
            // etiqueta — pequeña
            ctx.font = '600 9.5px DM Sans, sans-serif';
            ctx.fillStyle = '#7a9490';
            const shortLabel = maxLabel.length > 14 ? maxLabel.slice(0, 13) + '…' : maxLabel;
            ctx.fillText(shortLabel.toUpperCase(), cx, cy + 12);
            ctx.restore();
        },
    };

    // ─── Plugin: anotación de pico y mínimo en la línea ──────────────────────
    const lineAnnotationsPlugin = {
        id: 'lineAnnotations',
        afterDatasetsDraw(chart) {
            if (chart.config.type !== 'line') return;
            const { ctx, data } = chart;
            const dataset = data.datasets[0];
            if (!dataset?.data?.length) return;
            const nums   = dataset.data.map(Number);
            const maxVal = Math.max(...nums);
            const minVal = Math.min(...nums);
            const fmt    = new Intl.NumberFormat('es-CO');
            ctx.save();

            chart.getDatasetMeta(0).data.forEach((point, i) => {
                const val = nums[i];
                const isPeak = val === maxVal;
                const isMin  = val === minVal && minVal !== maxVal;
                if (!isPeak && !isMin) return;

                const x = point.x;
                const y = point.y;
                const label   = fmt.format(val);
                const tag      = isPeak ? '▲ Pico' : '▼ Mín';
                const tagColor = isPeak ? '#e63946' : '#f4a261';

                // Línea vertical punteada desde el punto hasta la anotación
                const boxH = 28;
                const canvasHeight = chart.height || 0;
                const preferredBoxY = isPeak ? y - 52 : y + 18;
                const boxY = Math.max(4, Math.min(preferredBoxY, canvasHeight - boxH - 4));
                ctx.beginPath();
                ctx.setLineDash([3, 3]);
                ctx.strokeStyle = tagColor + '66';
                ctx.lineWidth = 1;
                ctx.moveTo(x, isPeak ? y - 8 : y + 8);
                ctx.lineTo(x, isPeak ? boxY + 28 : boxY - 4);
                ctx.stroke();
                ctx.setLineDash([]);

                // Caja de anotación
                ctx.font = '700 9px DM Sans, sans-serif';
                const tagW  = ctx.measureText(tag).width;
                ctx.font = '700 11px DM Sans, sans-serif';
                const valW  = ctx.measureText(label).width;
                const boxW  = Math.max(tagW, valW) + 16;
                const bx    = Math.min(Math.max(x - boxW / 2, 4), (chart.chartArea?.right || 9999) - boxW - 4);
                const by    = boxY;

                ctx.beginPath();
                ctx.roundRect(bx, by, boxW, boxH, 5);
                ctx.fillStyle = 'rgba(10, 18, 16, 0.92)';
                ctx.fill();
                ctx.strokeStyle = tagColor + 'bb';
                ctx.lineWidth = 1.2;
                ctx.stroke();

                // Tag (pico / mín)
                ctx.font = '700 9px DM Sans, sans-serif';
                ctx.fillStyle = tagColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(tag, bx + boxW / 2, by + 9);

                // Valor
                ctx.font = '700 11px DM Sans, sans-serif';
                ctx.fillStyle = '#e8ede6';
                ctx.fillText(label, bx + boxW / 2, by + 21);
            });
            ctx.restore();
        },
    };

    // ─── Función: gráfico de línea con anotaciones ────────────────────────────
    const renderLineChart = (canvasId, labels, values) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !window.Chart) return;
        if (window.__dashboardCharts?.[canvasId]) window.__dashboardCharts[canvasId].destroy();
        if (!window.__dashboardCharts) window.__dashboardCharts = {};

        const ctx2d = canvas.getContext('2d');
        const h = canvas.offsetHeight || 260;
        const total = values.reduce((sum, value) => sum + (Number(value) || 0), 0);
        const grad = ctx2d.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0,   'rgba(230, 57, 70, 0.55)');
        grad.addColorStop(0.55,'rgba(230, 57, 70, 0.15)');
        grad.addColorStop(1,   'rgba(230, 57, 70, 0.00)');

        window.__dashboardCharts[canvasId] = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Víctimas por año',
                    data: values,
                    borderColor: '#e63946',
                    backgroundColor: grad,
                    borderWidth: 3,
                    pointBackgroundColor: '#e63946',
                    pointBorderColor: '#17211f',
                    pointBorderWidth: 2.5,
                    pointRadius: 6,
                    pointHoverRadius: 10,
                    pointHoverBackgroundColor: '#fff',
                    fill: true,
                    tension: 0.42,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 700, easing: 'easeOutCubic' },
                layout: { padding: { top: 60, bottom: 4, left: 4, right: 4 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(10,15,14,0.95)',
                        titleColor: '#e63946',
                        bodyColor: '#e8ede6',
                        borderColor: 'rgba(230,57,70,0.45)',
                        borderWidth: 1,
                        padding: { x: 14, y: 10 },
                        cornerRadius: 8,
                        callbacks: {
                            label: (ctx) => {
                                const value = Number(ctx.parsed.y) || 0;
                                const percentage = total ? ` · ${(value / total * 100).toFixed(1).replace('.', ',')}%` : '';
                                return ` ${new Intl.NumberFormat('es-CO').format(value)}${percentage}`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false, drawBorder: false },
                        border: { display: false },
                        ticks: { color: '#8fa89f', font: { family: 'DM Sans', size: 11 } },
                    },
                    y: {
                        beginAtZero: false,
                        border: { display: false },
                        grid: { color: 'rgba(255,255,255,0.07)', drawBorder: false },
                        ticks: {
                            color: '#8fa89f',
                            font: { family: 'DM Sans', size: 11 },
                            callback: (v) => new Intl.NumberFormat('es-CO', { notation: 'compact' }).format(v),
                        },
                    },
                },
            },
            plugins: [lineAnnotationsPlugin],
        });
    };

    // ─── Función: barras regionales con barra dominante en lima ───────────────
    const renderRegionsChart = (canvasId, labels, values) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !window.Chart) return;
        if (window.__dashboardCharts?.[canvasId]) window.__dashboardCharts[canvasId].destroy();
        if (!window.__dashboardCharts) window.__dashboardCharts = {};

        const maxVal  = Math.max(...values);
        const ctx2d   = canvas.getContext('2d');

        const bgColors = values.map((v, i) => {
            // Escala de calor: mayor volumen = rojo, menor = amarillo dorado
            // Región dominante recibe rojo crimson; el resto escala cálida descendente
            const heatScale = ['#f4a26188','#e9c46a88','#e9c46a66','#a8dadc88','#a8dadc66','#a8dadc44'];
            if (v === maxVal) return '#e6394699'; // rojo crimson — máxima urgencia
            return heatScale[i % heatScale.length];
        });
        const borderColors = values.map((v) => v === maxVal ? '#e63946' : 'transparent');

        window.__dashboardCharts[canvasId] = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Regiones',
                    data: values,
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: 2,
                    borderRadius: 7,
                    borderSkipped: false,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 600, easing: 'easeOutCubic' },
                layout: { padding: { top: 32, bottom: 4 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(10,15,14,0.95)',
                        titleColor: '#e63946',
                        bodyColor: '#e8ede6',
                        borderColor: 'rgba(230,57,70,0.45)',
                        borderWidth: 1,
                        padding: { x: 14, y: 10 },
                        cornerRadius: 8,
                        callbacks: {
                            label: (ctx) => ` ${new Intl.NumberFormat('es-CO').format(ctx.parsed.y)}`,
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false, drawBorder: false },
                        border: { display: false },
                        ticks: { color: '#8fa89f', font: { family: 'DM Sans', size: 10 }, maxRotation: 30 },
                    },
                    y: {
                        beginAtZero: true,
                        border: { display: false },
                        grid: { color: 'rgba(255,255,255,0.07)', drawBorder: false },
                        ticks: {
                            color: '#8fa89f',
                            font: { family: 'DM Sans', size: 11 },
                            callback: (v) => new Intl.NumberFormat('es-CO', { notation: 'compact' }).format(v),
                        },
                    },
                },
            },
            plugins: [valueLabelsPlugin],
        });
    };

    // ─── Función: barras horizontales para grupos de edad ────────────────────
    const renderHorizontalBarChart = (canvasId, labels, values) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !window.Chart) return;
        if (window.__dashboardCharts?.[canvasId]) window.__dashboardCharts[canvasId].destroy();
        if (!window.__dashboardCharts) window.__dashboardCharts = {};

        // Paleta cálida degradante: naranja intenso (adultos/jóvenes) → amarillo dorado (menor volumen)
        // Naranja = vulnerabilidad humana, calidez; se enfría hacia amarillo a menor prevalencia
        const HPALETTE = ['#e76f51','#f4a261','#e9c46a','#a8dadc','#457b9d','#1d3557','#ce93d8'];
        const maxVal = Math.max(...values);
        const ctx2d  = canvas.getContext('2d');
        const formatter = new Intl.NumberFormat('es-CO');

        // Plugin etiquetas al final de cada barra horizontal
        const hBarLabels = {
            id: 'hBarLabels',
            afterDatasetsDraw(chart) {
                const { ctx: c, chartArea } = chart;
                if (!chartArea) return;
                const total = chart.data.datasets[0].data.reduce((sum, item) => sum + (Number(item) || 0), 0);
                c.save();
                chart.getDatasetMeta(0).data.forEach((bar, i) => {
                    const val = Number(chart.data.datasets[0].data[i]);
                    if (!val) return;
                    const x = bar.x + 8;
                    const y = bar.y;
                    const label = formatter.format(val);
                    const percentage = total ? `${(val / total * 100).toFixed(1).replace('.', ',')}%` : '0%';
                    c.font = '700 11px DM Sans, sans-serif';
                    const tw = Math.max(c.measureText(label).width, c.measureText(percentage).width) + 12;
                    const bx = Math.min(x, (chartArea?.right || 9999) - tw - 2);
                    c.beginPath();
                    c.roundRect(bx, y - 15, tw, 30, 4);
                    c.fillStyle = 'rgba(10,18,16,0.88)';
                    c.fill();
                    c.strokeStyle = 'rgba(231,111,81,0.50)';
                    c.lineWidth = 1;
                    c.stroke();
                    c.fillStyle = '#f4a261';
                    c.textAlign = 'left';
                    c.textBaseline = 'middle';
                    c.fillText(label, bx + 6, y - 6);
                    c.font = '600 9px DM Sans, sans-serif';
                    c.fillStyle = '#f4a261';
                    c.fillText(percentage, bx + 6, y + 7);
                });
                c.restore();
            },
        };

        window.__dashboardCharts[canvasId] = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Grupos de edad',
                    data: values,
                    backgroundColor: values.map((v, i) => HPALETTE[i % HPALETTE.length] + 'cc'),
                    borderColor: values.map((v, i) => HPALETTE[i % HPALETTE.length]),
                    borderWidth: 0,
                    borderRadius: 6,
                    borderSkipped: false,
                }],
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 650, easing: 'easeOutCubic' },
                layout: { padding: { top: 4, bottom: 4, left: 4, right: 100 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(10,15,14,0.95)',
                        titleColor: '#f4a261',
                        bodyColor: '#e8ede6',
                        borderColor: 'rgba(244,162,97,0.45)',
                        borderWidth: 1,
                        padding: { x: 14, y: 10 },
                        cornerRadius: 8,
                        callbacks: {
                            label: (ctx) => ` ${new Intl.NumberFormat('es-CO').format(ctx.parsed.x)}`,
                        },
                    },
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        border: { display: false },
                        grid: { color: 'rgba(255,255,255,0.07)', drawBorder: false },
                        ticks: {
                            color: '#8fa89f',
                            font: { family: 'DM Sans', size: 10 },
                            callback: (v) => new Intl.NumberFormat('es-CO', { notation: 'compact' }).format(v),
                        },
                    },
                    y: {
                        grid: { display: false, drawBorder: false },
                        border: { display: false },
                        ticks: { color: '#c8d6d0', font: { family: 'DM Sans', size: 11, weight: '600' } },
                    },
                },
            },
            plugins: [hBarLabels],
        });
    };

    const renderDashboard = () => {
        const annual = getFilteredSeries(dashboardData.annual || [], state.year);
        const regions = getFilteredSeries(dashboardData.regions || [], state.region);
        const gender = getFilteredSeries(dashboardData.gender || [], state.gender);
        const ages = getFilteredSeries(dashboardData.ages || [], state.age);
        const weapons = dashboardData.weapons || [];
        const facets = dashboardData.facets || [];
        const activeFacets = facets.filter((item) => (
            (!state.year || state.year === 'Todos' || item.year === state.year)
            && (!state.region || state.region === 'Todos' || item.region.toLowerCase() === state.region.toLowerCase())
            && (!state.gender || state.gender === 'Todos' || item.gender.toLowerCase() === state.gender.toLowerCase())
            && (!state.age || state.age === 'Todos' || item.age.toLowerCase() === state.age.toLowerCase())
        ));
        const facetSeries = (key, fallback) => {
            if (!activeFacets.length) {
                return fallback;
            }
            const totals = activeFacets.reduce((result, item) => {
                result[item[key]] = (result[item[key]] || 0) + parseMetric(item.value);
                return result;
            }, {});
            return Object.entries(totals).map(([label, value]) => ({ label, value: String(value) }));
        };

        const annualSeries = facetSeries('year', annual.length ? annual : dashboardData.annual || []);
        const regionSeries = facetSeries('region', regions.length ? regions : dashboardData.regions || []);
        const genderSeries = facetSeries('gender', gender.length ? gender : dashboardData.gender || []);
        const ageSeries = facetSeries('age', ages.length ? ages : dashboardData.ages || []);
        const weaponSeries = facetSeries('weapon', weapons);

        updateKpis(annualSeries, regionSeries);
        renderLineChart('annual-chart', annualSeries.map((i) => i.label), annualSeries.map((i) => parseMetric(i.value)));
        renderRegionsChart('regions-chart', regionSeries.map((i) => i.label), regionSeries.map((i) => parseMetric(i.value)));
        renderChart('gender-chart', 'doughnut', genderSeries.map((i) => i.label), genderSeries.map((i) => parseMetric(i.value)), 'Género');
        renderChart('weapons-chart', 'doughnut', weaponSeries.map((i) => i.label), weaponSeries.map((i) => parseMetric(i.value)), 'Medios');
        renderHorizontalBarChart('ages-chart', ageSeries.map((i) => i.label), ageSeries.map((i) => parseMetric(i.value)));
        renderLegend('gender-legend', genderSeries.map((i) => i.label), genderSeries.map((i) => i.value));
        renderLegend('weapons-legend', weaponSeries.map((i) => i.label), weaponSeries.map((i) => i.value), 8);
    };

    const syncFilters = () => {
        state.year = yearSelect.value;
        state.region = regionSelect.value;
        state.gender = genderSelect.value;
        state.age = ageSelect.value;
        const activeLabels = [state.year, state.region, state.gender, state.age].filter((value) => value && value !== 'Todos');
        const nextUrl = new URL(window.location.href);
        ['year', 'region', 'gender', 'age'].forEach((key) => {
            const value = state[key];
            if (value && value !== 'Todos') nextUrl.searchParams.set(key, value);
            else nextUrl.searchParams.delete(key);
        });
        window.history.replaceState({}, '', nextUrl);
        if (filterStatus) {
            filterStatus.textContent = activeLabels.length ? `Filtros activos · ${activeLabels.join(' · ')}` : 'Vista completa · sin filtros activos';
        }
        if (reportPanel) reportPanel.hidden = true;
        renderDashboard();
    };

    const renderHistory = () => {
        const items = JSON.parse(localStorage.getItem('lesiones-report-history') || '[]');
        if (!historySection || !historyList || !items.length) return;
        historySection.hidden = false;
        historyList.innerHTML = items.map((item, index) => `<article><strong>${new Date(item.createdAt).toLocaleString('es-CO')}</strong><span>${item.filters.join(' · ')}</span><button type="button" data-history-index="${index}">Abrir informe</button></article>`).join('');
        historyList.querySelectorAll('[data-history-index]').forEach((button) => button.addEventListener('click', () => {
            const item = items[Number(button.dataset.historyIndex)];
            if (reportText && reportPanel) { reportText.textContent = item.text; reportPanel.hidden = false; reportPanel.scrollIntoView({ behavior: 'smooth' }); }
        }));
    };

    const resetFilters = () => {
        state.year = 'Todos';
        state.region = 'Todos';
        state.gender = 'Todos';
        state.age = 'Todos';
        setOptions();
        syncFilters();
    };

    const exportCharts = () => {
        const charts = Object.values(window.__dashboardCharts || {});
        if (!charts.length) return;
        const rows = ['Gráfico, Categoría, Valor'];
        charts.forEach((chart) => chart.data.labels.forEach((label, index) => rows.push(`"${chart.data.datasets[0].label}","${label}",${chart.data.datasets[0].data[index]}`)));
        const blob = new Blob([`\ufeff${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.download = 'lesiones-dashboard.csv';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
        if (filterStatus) filterStatus.textContent = 'Exportación lista · CSV descargado';
    };

    const printDashboard = () => window.print();
    const togglePresentation = () => {
        document.body.classList.toggle('dashboard-presentation-mode');
        const active = document.body.classList.contains('dashboard-presentation-mode');
        if (presentationButton) presentationButton.textContent = active ? 'Salir de presentación' : 'Modo presentación';
        if (active) document.querySelector('.interactive-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && document.body.classList.contains('dashboard-presentation-mode')) togglePresentation();
    });

    const formatReportNumber = (value) => new Intl.NumberFormat('es-CO').format(Number(value) || 0);
    const generateReport = () => {
        const charts = window.__dashboardCharts || {};
        const filters = [
            `Año: ${state.year}`,
            `Región: ${state.region}`,
            `Género: ${state.gender}`,
            `Grupo de edad: ${state.age}`,
        ];
        const chartSummary = (id, label) => {
            const chart = charts[id];
            if (!chart || !chart.data.labels.length) return `${label}: sin datos disponibles.`;
            const values = chart.data.labels.map((item, index) => ({ label: item, value: Number(chart.data.datasets[0].data[index]) || 0 }));
            const top = values.reduce((winner, item) => item.value > winner.value ? item : winner, values[0]);
            return `${label}: ${top.label} concentra ${formatReportNumber(top.value)} registros en la vista filtrada.`;
        };
        const total = document.getElementById('kpi-total')?.textContent || '0';
        const peakYear = document.getElementById('kpi-top-year')?.textContent || '-';
        const municipalities = document.getElementById('kpi-municipios')?.textContent || '0';
        const lines = [
            'INFORME TÉCNICO GENERADO DESDE EL DASHBOARD',
            'Lesiones personales en Colombia · 2021–2025',
            `Fecha de generación: ${new Date().toLocaleString('es-CO')}`,
            '',
            '1. CONFIGURACIÓN DE LA CONSULTA',
            ...filters.map((filter) => `- ${filter}`),
            '',
            '2. INDICADORES DE LA VISTA',
            `- Víctimas o cantidad registrada: ${total}`,
            `- Año con mayor valor en la serie: ${peakYear}`,
            `- Municipios cubiertos: ${municipalities}`,
            '',
            '3. LECTURA DE LOS GRÁFICOS',
            `- ${chartSummary('annual-chart', 'Tendencia anual')}`,
            `- ${chartSummary('regions-chart', 'Distribución regional')}`,
            `- ${chartSummary('gender-chart', 'Distribución por género')}`,
            `- ${chartSummary('weapons-chart', 'Medios empleados')}`,
            `- ${chartSummary('ages-chart', 'Grupos de edad')}`,
            '',
            '4. INTERPRETACIÓN TÉCNICA',
            'Esta lectura describe los registros que coinciden con los filtros seleccionados. Las cifras permiten identificar concentraciones y diferencias, pero no demuestran por sí solas relaciones causales.',
            '',
            'Fuente: SIEDCO · Policía Nacional. Informe generado automáticamente a partir de los datos visibles del dashboard.',
        ];
        if (reportText) reportText.textContent = lines.join('\n');
        const history = JSON.parse(localStorage.getItem('lesiones-report-history') || '[]');
        history.unshift({ createdAt: new Date().toISOString(), filters, text: lines.join('\n') });
        localStorage.setItem('lesiones-report-history', JSON.stringify(history.slice(0, 5)));
        renderHistory();
        if (reportPanel) {
            reportPanel.hidden = false;
            reportPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const downloadReport = async () => {
        if (!reportText?.textContent) generateReport();
        if (!reportText?.textContent || !reportCsrfToken) return;
        downloadReportButton.disabled = true;
        downloadReportButton.textContent = 'Generando PDF...';
        try {
            const response = await fetch('/api/informe-pdf/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': reportCsrfToken },
                body: JSON.stringify({
                    report_text: reportText.textContent,
                    chart_images: Object.fromEntries(Object.entries(window.__dashboardCharts || {}).map(([id, chart]) => [id, chart.toBase64Image('image/png', 1)])),
                }),
            });
            if (!response.ok) throw new Error('No fue posible generar el PDF');
            const blob = await response.blob();
            const link = document.createElement('a');
            link.download = 'informe-dashboard.pdf';
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);
        } finally {
            downloadReportButton.disabled = false;
            downloadReportButton.textContent = 'Descargar PDF';
        }
    };

    const downloadReportText = () => {
        if (!reportText?.textContent) generateReport();
        const blob = new Blob([reportText.textContent], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.download = 'informe-dashboard.txt';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const printReport = () => {
        if (!reportText?.textContent) generateReport();
        document.body.classList.add('printing-generated-report');
        window.print();
        window.addEventListener('afterprint', () => document.body.classList.remove('printing-generated-report'), { once: true });
    };

    setOptions();
    yearSelect.addEventListener('change', syncFilters);
    regionSelect.addEventListener('change', syncFilters);
    genderSelect.addEventListener('change', syncFilters);
    ageSelect.addEventListener('change', syncFilters);
    resetButton?.addEventListener('click', resetFilters);
    exportButton?.addEventListener('click', exportCharts);
    printButton?.addEventListener('click', printDashboard);
    presentationButton?.addEventListener('click', togglePresentation);
    generateReportButton?.addEventListener('click', generateReport);
    downloadReportButton?.addEventListener('click', downloadReport);
    downloadTextButton?.addEventListener('click', downloadReportText);
    printReportButton?.addEventListener('click', printReport);
    copyLinkButton?.addEventListener('click', async () => {
        await navigator.clipboard.writeText(window.location.href);
        if (copyStatus) copyStatus.textContent = 'Enlace copiado';
    });
    renderDashboard();
    renderHistory();
};

initializePageInteractions();
initializeGlossary();

const dashboardRoot = document.querySelector('[data-dashboard-root]');
if (dashboardRoot || document.getElementById('dashboard-data')) {
    initializeDashboard();
}

initializeQrContact();
initializeChat();
