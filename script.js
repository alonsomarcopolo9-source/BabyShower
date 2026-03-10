$(document).ready(function() {
    // ===========================================
    // 1. CONFIGURACIÓN
    // ===========================================
    const SHEETDB_URL = CONFIG.SHEETDB_URL; // Toma la URL del archivo config
    
    // Verificar que la configuración existe
    if (!SHEETDB_URL || SHEETDB_URL.includes('TU-API-KEY')) {
        console.warn('⚠️ Configuración no encontrada. Usando modo local.');
        useLocalMode();
    }
    let isPlaying = true;
    const audio = document.getElementById('bgMusic');
    let playAttempt = 0; // Contador de intentos

    // ===========================================
    // 2. CONFIGURACIÓN DE MÚSICA - REPRODUCCIÓN AUTOMÁTICA
    // ===========================================
    
    // Configurar volumen
    audio.volume = 0.3;
    audio.loop = true;
    
    // Función para intentar reproducir música
    function attemptAutoPlay() {
        audio.play()
            .then(() => {
                console.log('🎵 Música reproduciendo automáticamente');
                isPlaying = true;
                $('#musicBtn').addClass('playing');
                $('#musicText').text('Pausar música');
                
                // Actualizar el indicador visual
                updateMusicIndicator(true);
            })
            .catch(error => {
                console.log(`🔇 Intento ${playAttempt + 1} falló:`, error);
                playAttempt++;
                
                // Intentar de nuevo después de 1 segundo (máximo 5 intentos)
                if (playAttempt < 5) {
                    setTimeout(attemptAutoPlay, 1000);
                } else {
                    console.log('⚠️ No se pudo reproducir automáticamente después de 5 intentos');
                    showMusicHelp();
                }
            });
    }

    // Mostrar ayuda si no se puede reproducir automáticamente
    function showMusicHelp() {
        $('#musicBtn').removeClass('playing');
        $('#musicText').text('Haz clic para reproducir música');
        
        // Mostrar mensaje sutil
        const musicHelp = $('<div class="music-help">Haz clic en el botón para escuchar música 🎵</div>');
        $('.music-section').append(musicHelp);
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            musicHelp.fadeOut();
        }, 5000);
    }

    // Actualizar indicador visual de música
    function updateMusicIndicator(playing) {
        if (playing) {
            $('.music-indicator').addClass('active');
        } else {
            $('.music-indicator').removeClass('active');
        }
    }

    // Precargar el audio
    audio.load();

    // Manejar errores de audio
    audio.addEventListener('error', function(e) {
        console.error('❌ Error al cargar archivo de audio:', e);
        $('#musicBtn').prop('disabled', true);
        $('#musicText').text('🎵 Música no disponible');
    });

    // Evento cuando el audio puede reproducirse
    audio.addEventListener('canplaythrough', function() {
        console.log('✅ Audio cargado y listo para reproducir');
        // Intentar reproducción automática
        attemptAutoPlay();
    });

    // Evento cuando el audio se pausa por el navegador
    audio.addEventListener('pause', function() {
        if (isPlaying) {
            // Si se pausó inesperadamente, intentar reanudar
            setTimeout(() => {
                if (isPlaying) {
                    audio.play().catch(() => {});
                }
            }, 100);
        }
    });

    // ===========================================
    // 3. CONTROL MANUAL DE MÚSICA
    // ===========================================
    $('#musicBtn').click(function() {
        if (isPlaying) {
            audio.pause();
            $(this).removeClass('playing');
            $('#musicText').text('Reproducir música');
            updateMusicIndicator(false);
            isPlaying = false;
        } else {
            audio.play()
                .then(() => {
                    $(this).addClass('playing');
                    $('#musicText').text('Pausar música');
                    updateMusicIndicator(true);
                    isPlaying = true;
                })
                .catch(error => {
                    console.log('Error al reproducir:', error);
                    alert('Por favor, haz clic en el botón de música para reproducir');
                });
        }
    });

    // ===========================================
    // 4. MODAL Y FORMULARIO
    // ===========================================
    $('#acceptBtn').click(function() {
        $('#modal').addClass('active');
        $('body').css('overflow', 'hidden');
    });

    $('#closeModal, .modal').click(function(e) {
        if (e.target === this || $(e.target).hasClass('close-modal')) {
            $('#modal').removeClass('active');
            $('#attendanceForm')[0].reset();
            $('#successMessage').removeClass('show');
            $('body').css('overflow', '');
        }
    });

    $('.modal-content').click(function(e) {
        e.stopPropagation();
    });

    // ===========================================
    // 5. ENVÍO DEL FORMULARIO
    // ===========================================
    $('#attendanceForm').submit(function(e) {
        e.preventDefault();

        // Validaciones
        const nombre = $('#name').val().trim();
        if (nombre === '') {
            alert('Por favor ingresa tu nombre');
            return;
        }

        const phone = $('#phone').val().replace(/\D/g, '');
        if (phone.length < 10) {
            alert('Teléfono inválido (debe tener 10 dígitos)');
            return;
        }

        const attendees = parseInt($('#attendees').val());
        if (attendees < 1 || attendees > 10) {
            alert('Número de asistentes debe ser entre 1 y 10');
            return;
        }

        // Preparar datos
        const formData = {
            data: [
                {
                    nombre: nombre,
                    telefono: phone,
                    asistentes: attendees,
                    fecha_registro: new Date().toLocaleString('es-MX', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    id: Date.now().toString()
                }
            ]
        };

        console.log('📤 Enviando datos:', formData);

        // Verificar URL de SheetDB
        if (SHEETDB_URL.includes('TU-API-KEY-AQUI')) {
            console.warn('⚠️ Usando modo local');
            saveToLocalStorage(formData.data[0]);
            showSuccess('🧸 ¡Gracias por confirmar! 🧸');
            return;
        }

        // Enviar a SheetDB
        $.ajax({
            url: SHEETDB_URL,
            method: 'POST',
            data: JSON.stringify(formData),
            contentType: 'application/json',
            success: function(response) {
                console.log('✅ Datos guardados:', response);
                saveToLocalStorage(formData.data[0]);
                showSuccess('🧸 ¡Gracias por confirmar! 🧸');
            },
            error: function(xhr, status, error) {
                console.error('❌ Error:', error);
                saveToLocalStorage(formData.data[0]);
                showSuccess('🧸 ¡Gracias por confirmar! 🧸');
            }
        });
    });

    // ===========================================
    // 6. FUNCIONES AUXILIARES
    // ===========================================
    function saveToLocalStorage(data) {
        let guestList = [];
        if (localStorage.getItem('guestList')) {
            guestList = JSON.parse(localStorage.getItem('guestList'));
        }
        guestList.push(data);
        localStorage.setItem('guestList', JSON.stringify(guestList));
        console.log('💾 Backup local. Total:', guestList.length);
    }

    function showSuccess(message) {
        $('#successMessage').text(message).addClass('show');
        $('#attendanceForm')[0].reset();

        setTimeout(() => {
            $('#modal').removeClass('active');
            $('#successMessage').removeClass('show');
            $('body').css('overflow', '');
        }, 2500);
    }

    // ===========================================
    // 7. WHATSAPP
    // ===========================================
    function updateWhatsAppLink() {
        const message = encodeURIComponent(
            `🧸 *Invitación Baby Shower - Eliana Constanza* 🧸\n\n` +
            `¡Te esperamos para celebrar!\n\n` +
            `📅 *Fecha:* Sábado 02 de Mayo, 2026\n` +
            `⏰ *Hora:* 4:00 PM\n` +
            `📍 *Lugar:* Salón "El Jardín" Av Aleta 110, Col del Mar, Tláhuac, 13270 Ciudad de México, CDMX\n\n` +
            `✨ *Confirma tu asistencia aquí:*\n` +
            `${window.location.href}`
        );
        
        $('#whatsappShare').attr('href', `https://wa.me/?text=${message}`);
    }

    updateWhatsAppLink();

    // ===========================================
    // 8. INTERACCIÓN CON LA PÁGINA (respaldo)
    // ===========================================
    // Si el usuario hace clic en cualquier parte, intentar reproducir
    document.body.addEventListener('click', function() {
        if (!isPlaying && audio.paused) {
            audio.play()
                .then(() => {
                    console.log('🎵 Música iniciada por interacción del usuario');
                    isPlaying = true;
                    $('#musicBtn').addClass('playing');
                    $('#musicText').text('Pausar música');
                    updateMusicIndicator(true);
                })
                .catch(() => {});
        }
    }, { once: true }); // Solo el primer clic
});