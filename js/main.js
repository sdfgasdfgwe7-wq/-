document.addEventListener('DOMContentLoaded', function() {
    const CREDITS_LIST = [
        { 
            name: "HEFUN", 
            role: "程序设计与开发",
            avatar: "pictures/avatars/boxedmeal.gif",
            links: [
                { platform: 'bilibili', url: 'https://m.bilibili.com/space/3546967852452617', icon: 'fab fa-bilibili' },
                { platform: 'douyin', url: 'https://v.douyin.com/cPDCh7trDxU/', icon: 'fab fa-tiktok' },
                { platform: 'kuaishou', url: 'https://v.kuaishou.com/721zQqlH', text: 'KS' }
            ]
        }
    ];
    
    const creditsModal = $('#credits-modal');
    const creditsAvatar = $('#credits-avatar');
    const creditsName = $('#credits-name');
    const creditsRole = $('#credits-role');
    const creditsIndicators = $('#credits-indicators');
    const clickAudio = document.getElementById('click-audio');
    
    let currentCreditIndex = 0;
    let hefunClickCount = 0;
    let hefunClickTimer = null;
    let debugUnlocked = false;
    
    const checkGMUnlocked = () => {
        try {
            return localStorage.getItem('ab_gm_unlocked') === 'true';
        } catch (e) {
            return false;
        }
    };
    
    debugUnlocked = checkGMUnlocked();
    
    const loadSpecialFont = () => {
        if ($('#hefun-special-font').length) return;
        const fontStyle = document.createElement('style');
        fontStyle.id = 'hefun-special-font';
        fontStyle.textContent = `
            @font-face {
                font-family: 'Avicii';
                src: url('fonts/Avicii.ttf') format('truetype');
                font-display: swap;
            }
            #credits-name.hefun-special-font-style,
            #credits-name.hefun-special-font-style * {
                font-family: 'Avicii', 'Arial', sans-serif !important;
                font-size: 1.2em !important;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.1) !important;
                font-weight: bold !important;
                letter-spacing: 1px !important;
            }
            body #credits-name.hefun-special-font-style,
            body #credits-name.hefun-special-font-style *,
            body .modal #credits-name.hefun-special-font-style,
            body .modal #credits-name.hefun-special-font-style * {
                font-family: 'Avicii', 'Arial', sans-serif !important;
                font-size: 1.2em !important;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.1) !important;
                font-weight: bold !important;
                letter-spacing: 1px !important;
            }
            #credits-modal #credits-name.hefun-special-font-style {
                font-family: 'Avicii', 'Arial', sans-serif !important;
            }
            #credits-name.hefun-special-font-style {
                font-family: 'Avicii', 'Arial', sans-serif !important;
                font-size: 1.2em !important;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.1) !important;
                font-weight: bold !important;
                letter-spacing: 1px !important;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
        `;
        document.head.appendChild(fontStyle);
    };
    
    const preloadFont = () => {
        if (!debugUnlocked) return;
        loadSpecialFont();
        
        if (window.FontFace) {
            const font = new FontFace('Avicii', 'url(fonts/Avicii.ttf)', {
                display: 'swap',
                weight: 'bold'
            });
            
            font.load().then(loadedFace => {
                document.fonts.add(loadedFace);
                if (currentCreditIndex === 0) {
                    setTimeout(() => updateCreditInfo(), 50);
                    setTimeout(() => applySpecialFontToHeFun(), 100);
                }
            }).catch(() => {});
        }
        
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'font';
        link.type = 'font/ttf';
        link.href = 'fonts/Avicii.ttf';
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
        
        const preloadStyle = document.createElement('style');
        preloadStyle.textContent = `
            #credits-name.hefun-special-font-style::before {
                content: '';
                font-family: 'Avicii';
                visibility: hidden;
                position: absolute;
            }
        `;
        document.head.appendChild(preloadStyle);
        
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                if (debugUnlocked && currentCreditIndex === 0) {
                    setTimeout(() => updateCreditInfo(), 100);
                    setTimeout(() => applySpecialFontToHeFun(), 150);
                }
            });
        }
        
        if (document.fonts && document.fonts.check) {
            const checkFontLoaded = setInterval(() => {
                if (document.fonts.check('1em Avicii') || document.fonts.check('bold 1em Avicii')) {
                    clearInterval(checkFontLoaded);
                    if (debugUnlocked && currentCreditIndex === 0) {
                        setTimeout(() => updateCreditInfo(), 50);
                        setTimeout(() => applySpecialFontToHeFun(), 100);
                    }
                }
            }, 100);
            
            setTimeout(() => clearInterval(checkFontLoaded), 5000);
        }
    };
    
    const setupGMDebugPersistent = () => {
        if (!debugUnlocked) return;
        
        const metaVersion = $('#metaVersionDisplay');
        if (metaVersion.length) {
            const currentText = metaVersion.text();
            if (currentText.indexOf('GM Debug ') !== 0) {
                metaVersion.text('GM Debug ' + currentText);
            }
        }
        
        let gmPersistent = $('#gm-persistent-indicator');
        if (gmPersistent.length === 0) {
            gmPersistent = $('<div id="gm-persistent-indicator"></div>')
                .text('')
                .css({
                    position: 'fixed',
                    top: '10px',
                    right: '10px',
                    fontSize: '10px',
                    color: '#666',
                    opacity: '0.7',
                    zIndex: '9999',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    fontFamily: 'monospace',
                    letterSpacing: '1px'
                });
            $('body').append(gmPersistent);
        }
        
        applySpecialFontToHeFun();
    };
    
    const applySpecialFontToHeFun = () => {
        if (!debugUnlocked) return;
        
        loadSpecialFont();
        
        const updateFont = () => {
            if (currentCreditIndex === 0) {
                creditsName[0].style.setProperty('font-family', "'Avicii', 'Arial', sans-serif", 'important');
                creditsName[0].style.setProperty('font-size', '1.2em', 'important');
                creditsName[0].style.setProperty('font-weight', 'bold', 'important');
                creditsName[0].style.setProperty('text-shadow', '2px 2px 4px rgba(0,0,0,0.1)', 'important');
                creditsName[0].style.setProperty('letter-spacing', '1px', 'important');
                creditsName.addClass('hefun-special-font-style');
                
                creditsName.find('*').each(function() {
                    this.style.setProperty('font-family', "'Avicii', 'Arial', sans-serif", 'important');
                    this.style.setProperty('font-size', '1.2em', 'important');
                    this.style.setProperty('font-weight', 'bold', 'important');
                });
            } else {
                creditsName.removeClass('hefun-special-font-style');
                creditsName[0].style.removeProperty('font-family');
                creditsName[0].style.removeProperty('font-size');
                creditsName[0].style.removeProperty('font-weight');
                creditsName[0].style.removeProperty('text-shadow');
                creditsName[0].style.removeProperty('letter-spacing');
                
                creditsName.find('*').each(function() {
                    this.style.removeProperty('font-family');
                    this.style.removeProperty('font-size');
                    this.style.removeProperty('font-weight');
                });
            }
        };
        
        updateFont();
        
        const observer = new MutationObserver(() => {
            updateFont();
        });
        observer.observe(creditsName[0], {
            characterData: true,
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
        
        [50, 100, 200, 300, 500, 800, 1000, 1500, 2000].forEach(delay => {
            setTimeout(updateFont, delay);
        });
        
        const fontCheckInterval = setInterval(() => {
            if (currentCreditIndex === 0 && debugUnlocked) {
                const computedFont = window.getComputedStyle(creditsName[0]).fontFamily;
                if (computedFont && !computedFont.includes('Avicii')) {
                    updateFont();
                }
            }
        }, 500);
        
        setTimeout(() => clearInterval(fontCheckInterval), 5000);
    };
    
    const playClickSound = () => {
        if (clickAudio) {
            clickAudio.currentTime = 0;
            clickAudio.play().catch(() => {});
        }
    };
    
    const initCreditsCarousel = () => {
        updateCreditInfo();
        createIndicators();
    };
    
    const handleAvatarClick = function() {
        $(this).css({
            transform: 'scale(0.9)',
            transition: 'transform 0.1s ease-out'
        });
        setTimeout(() => $(this).css({
            transform: 'scale(1)',
            transition: 'transform 0.2s ease-out'
        }), 100);
    };
    
    const handleNameClick = function() {
        var currentName = $('#credits-name').text();
        if (currentName === 'HEFUN') {
            if (debugUnlocked) {
                if (typeof showToast === 'function') {
                    showToast('Debug mode is already enabled, no need to enable again');
                } else {
                    var toast = $('#toast-message');
                    if (toast.length) {
                        toast.text('Debug mode is already enabled, no need to enable again').addClass('show');
                        setTimeout(function() {
                            toast.removeClass('show');
                        }, 2500);
                    }
                }
                return;
            }
            
            hefunClickCount++;
            if (hefunClickTimer) clearTimeout(hefunClickTimer);
            hefunClickTimer = setTimeout(function() {
                hefunClickCount = 0;
            }, 1000);
            if (hefunClickCount >= 5) {
                hefunClickCount = 0;
                clearTimeout(hefunClickTimer);
                debugUnlocked = true;
                localStorage.setItem('ab_gm_unlocked', 'true');
                setupGMDebugPersistent();
                preloadFont();
                
                if (typeof showToast === 'function') {
                    showToast('Debug mode has been enabled');
                } else {
                    var toast = $('#toast-message');
                    if (toast.length) {
                        toast.text('Debug mode has been enabled').addClass('show');
                        setTimeout(function() {
                            toast.removeClass('show');
                        }, 2500);
                    }
                }
            }
        }
    };
    
    const updateCreditInfo = () => {
        const person = CREDITS_LIST[currentCreditIndex];
        if (person) {
            creditsAvatar.attr('src', person.avatar).attr('alt', person.name).removeClass('active');
            setTimeout(() => creditsAvatar.addClass('active'), 10);
            creditsName.text(person.name);
            creditsRole.text(person.role);
            renderLinks(person.links);
            
            if (debugUnlocked && currentCreditIndex === 0) {
                creditsName.addClass('hefun-special-font-style');
                creditsName[0].style.setProperty('font-family', "'Avicii', 'Arial', sans-serif", 'important');
                creditsName[0].style.setProperty('font-size', '1.2em', 'important');
                creditsName[0].style.setProperty('font-weight', 'bold', 'important');
                creditsName[0].style.setProperty('text-shadow', '2px 2px 4px rgba(0,0,0,0.1)', 'important');
                creditsName[0].style.setProperty('letter-spacing', '1px', 'important');
            } else {
                creditsName.removeClass('hefun-special-font-style');
                creditsName[0].style.removeProperty('font-family');
                creditsName[0].style.removeProperty('font-size');
                creditsName[0].style.removeProperty('font-weight');
                creditsName[0].style.removeProperty('text-shadow');
                creditsName[0].style.removeProperty('letter-spacing');
            }
        }
    };
    
    const renderLinks = (links) => {
        const linksContainerId = 'credits-links-container';
        let linksContainer = $(`#${linksContainerId}`);
        if (linksContainer.length === 0) {
            linksContainer = $(`<div id="${linksContainerId}"></div>`).css({
                display: 'flex',
                justifyContent: 'center',
                gap: '15px',
                marginTop: '-25px',
                paddingBottom: '5px'
            });
            creditsIndicators.before(linksContainer);
        }
        linksContainer.empty();
        
        if (!links || links.length === 0) {
            linksContainer.hide();
            return;
        }
        
        linksContainer.show();
        
        _.forEach(links, link => {
            if (!link.url) return;
            const button = $(`<a href="${link.url}" target="_blank" rel="noopener noreferrer"></a>`).css({
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#444',
                color: '#fff',
                fontSize: '18px',
                textDecoration: 'none',
                transition: 'transform 0.2s, background 0.2s',
                overflow: 'hidden'
            });
            if (link.text) {
                button.text(link.text);
                button.css('fontSize', '12px');
                button.css('fontWeight', 'bold');
            } else {
                button.html(`<i class="${link.icon}"></i>`);
            }
            button.on('mouseenter', function() {
                $(this).css({ transform: 'scale(1.15)', background: '#666' });
            });
            button.on('mouseleave', function() {
                $(this).css({ transform: 'scale(1)', background: '#444' });
            });
            linksContainer.append(button);
        });
    };
    
    const createIndicators = () => {
        creditsIndicators.empty();
        _.forEach(CREDITS_LIST, (_, index) => {
            const indicator = $('<div>').addClass('compact-indicator');
            if (index === currentCreditIndex) indicator.addClass('active');
            creditsIndicators.append(indicator);
        });
    };
    
    const updateIndicators = () => {
        creditsIndicators.find('.compact-indicator').each((index, element) => {
            const $el = $(element);
            $el.toggleClass('active', index === currentCreditIndex);
        });
    };
    
    $(document).on('click', '#credits-prev', () => {
        playClickSound();
        currentCreditIndex = (currentCreditIndex - 1 + CREDITS_LIST.length) % CREDITS_LIST.length;
        updateCreditInfo();
        updateIndicators();
    });
    
    $(document).on('click', '#credits-next', () => {
        playClickSound();
        currentCreditIndex = (currentCreditIndex + 1) % CREDITS_LIST.length;
        updateCreditInfo();
        updateIndicators();
    });
    
    $(document).on('click', '#credits-avatar', handleAvatarClick);
    
    $(document).on('click', '#credits-name', handleNameClick);
    
    $(document).on('click', '.compact-indicator', function() {
        const index = $(this).index();
        playClickSound();
        currentCreditIndex = index;
        updateCreditInfo();
        updateIndicators();
    });
    
    initCreditsCarousel();
    
    if (debugUnlocked) {
        preloadFont();
        setupGMDebugPersistent();
    }
    
    const donateModal = $('#donate-modal');
    const achievementsModal = $('#achievements-modal');
    const lotteryModal = $('#lottery-modal');
    let activeModal = null;
    let isOpeningModal = false;
    
    const closeAllModals = () => {
        [donateModal, achievementsModal, lotteryModal].forEach(modal => {
            if (modal.hasClass('show')) {
                modal.removeClass('show');
                setTimeout(() => { if (!modal.hasClass('show')) modal.hide(); }, 200);
            }
        });
        activeModal = null;
    };
    
    const openModal = (modal) => {
        isOpeningModal = true;
        if (activeModal === modal[0] && modal.hasClass('show')) {
            closeModal(modal);
            isOpeningModal = false;
            return;
        }
        closeAllModals();
        modal.css('display', 'flex');
        setTimeout(() => {
            modal.addClass('show');
            activeModal = modal[0];
            isOpeningModal = false;
        }, 10);
        playClickSound();
    };
    
    const closeModal = (modal) => {
        modal.removeClass('show');
        setTimeout(() => {
            if (!modal.hasClass('show') && modal[0] === activeModal) {
                modal.hide();
                activeModal = null;
            }
        }, 200);
        playClickSound();
    };
    
    $('#sidebar-donate-btn').on('click', function(e) {
        e.stopPropagation();
        openModal(donateModal);
    });
    
    $('#sidebar-achievement-btn').on('click', function(e) {
        e.stopPropagation();
        openModal(achievementsModal);
    });
    
    $('#sidebar-lottery-btn').on('click', function(e) {
        e.stopPropagation();
        openModal(lotteryModal);
    });
    
    $('#donate-close').on('click', () => closeModal(donateModal));
    $('#achievements-close').on('click', () => closeModal(achievementsModal));
    $('#lottery-close').on('click', () => closeModal(lotteryModal));
    
    donateModal.on('click', (e) => {
        if (e.target === donateModal[0]) closeModal(donateModal);
    });
    
    achievementsModal.on('click', (e) => {
        if (e.target === achievementsModal[0]) closeModal(achievementsModal);
    });
    
    lotteryModal.on('click', (e) => {
        if (e.target === lotteryModal[0]) closeModal(lotteryModal);
    });
    
    $(document).on('click', function(e) {
        if (isOpeningModal) return;
        if (activeModal) {
            const target = $(e.target);
            const isDonateRelated = target.closest('#sidebar-donate-btn').length || target.closest('#donate-modal').length;
            const isAchievementsRelated = target.closest('#sidebar-achievement-btn').length || target.closest('#achievements-modal').length;
            const isLotteryRelated = target.closest('#sidebar-lottery-btn').length || target.closest('#lottery-modal').length;
            if (!isDonateRelated && !isAchievementsRelated && !isLotteryRelated) closeAllModals();
        }
    });
    
    $('#play-sound-2-btn').on('click', function() {
        const specialAudio5 = document.getElementById('special-audio-5');
        if (specialAudio5) {
            specialAudio5.currentTime = 0;
            specialAudio5.play().catch(() => {});
        }
    });
    
    $('#gm-debug-section').hide();
    
    if (debugUnlocked && currentCreditIndex === 0) {
        preloadFont();
        setupGMDebugPersistent();
    }
});
