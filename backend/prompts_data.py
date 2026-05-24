"""
Guion estructurado de entrenamiento vocal de 40+ minutos
Diseñado para capturar el biométrico vocal completo de un cantante:
- Rango tonal completo
- Registros (pecho, mixta, cabeza, falsete)
- Vibrato y dinámica
- Emoción y expresión
- Géneros: ranchera, rock graspy, bolero, pop
- Fonética completa
- Respiración, quiebres, rasp, imperfecciones naturales
"""

PROMPTS = [
    # FASE 1 — CALENTAMIENTO (5 min)
    {"id": "w1", "phase": "Calentamiento", "title": "Respiración diafragmática",
     "instructions": "Siéntate erguido. Inhala profundo por la nariz (4s), sostén (2s), exhala con 'ssss' (8s). Repite.",
     "duration": 60, "type": "breath"},
    {"id": "w2", "phase": "Calentamiento", "title": "Lip trills en glissando",
     "instructions": "Vibra los labios (brrrr) deslizando desde tu nota más grave hasta la más aguda y de vuelta.",
     "duration": 60, "type": "warmup"},
    {"id": "w3", "phase": "Calentamiento", "title": "Sirenas vocales (uuu)",
     "instructions": "Con vocal 'u' haz sirenas largas subiendo y bajando sin cortar el sonido.",
     "duration": 90, "type": "warmup"},
    {"id": "w4", "phase": "Calentamiento", "title": "Hum con boca cerrada",
     "instructions": "Zumba 'mmm' en diferentes alturas cómodas, busca resonancia en la máscara facial.",
     "duration": 60, "type": "warmup"},
    {"id": "w5", "phase": "Calentamiento", "title": "Ma-me-mi-mo-mu en escala",
     "instructions": "Canta 'ma-me-mi-mo-mu' subiendo un semitono cada vez hasta donde sea cómodo.",
     "duration": 60, "type": "warmup"},

    # FASE 2 — ESCALAS Y RANGO (5 min)
    {"id": "s1", "phase": "Escalas", "title": "Escala mayor ascendente",
     "instructions": "Do-Re-Mi-Fa-Sol-La-Si-Do. Empieza grave, sube medio tono en cada repetición.",
     "duration": 50, "type": "scale"},
    {"id": "s2", "phase": "Escalas", "title": "Escala mayor descendente",
     "instructions": "Do-Si-La-Sol-Fa-Mi-Re-Do. Empieza agudo, baja medio tono en cada repetición.",
     "duration": 50, "type": "scale"},
    {"id": "s3", "phase": "Escalas", "title": "Escala menor natural",
     "instructions": "La-Si-Do-Re-Mi-Fa-Sol-La. Expresiva y melancólica.",
     "duration": 50, "type": "scale"},
    {"id": "s4", "phase": "Escalas", "title": "Cromática ascendente",
     "instructions": "Sube medio tono a medio tono hasta tu nota más alta cómoda.",
     "duration": 60, "type": "scale"},
    {"id": "s5", "phase": "Escalas", "title": "Arpegio mayor (do-mi-sol-do)",
     "instructions": "Arpegio en diferentes tonalidades buscando tu extremo grave y agudo.",
     "duration": 60, "type": "scale"},

    # FASE 3 — INTERVALOS (4 min)
    {"id": "i1", "phase": "Intervalos", "title": "Terceras ascendentes",
     "instructions": "Do-Mi, Re-Fa, Mi-Sol... mantén afinación y conexión.",
     "duration": 60, "type": "interval"},
    {"id": "i2", "phase": "Intervalos", "title": "Quintas",
     "instructions": "Do-Sol, Re-La, Mi-Si... salta con precisión.",
     "duration": 60, "type": "interval"},
    {"id": "i3", "phase": "Intervalos", "title": "Octavas",
     "instructions": "Canta do grave a do agudo. Busca el mismo timbre en ambos.",
     "duration": 60, "type": "interval"},
    {"id": "i4", "phase": "Intervalos", "title": "Saltos amplios libres",
     "instructions": "Improvisa saltos de novena, décima y más. Explora los extremos del rango.",
     "duration": 60, "type": "interval"},

    # FASE 4 — NOTAS SOSTENIDAS Y DINÁMICA (5 min)
    {"id": "d1", "phase": "Dinámica", "title": "Nota sostenida mezzoforte",
     "instructions": "Elige una nota cómoda en tu registro medio y sostén 'aaah' al 60% de volumen.",
     "duration": 60, "type": "sustain"},
    {"id": "d2", "phase": "Dinámica", "title": "Crescendo",
     "instructions": "Misma nota, empieza muy suave y crece gradualmente hasta tu máximo sin quebrar.",
     "duration": 60, "type": "sustain"},
    {"id": "d3", "phase": "Dinámica", "title": "Decrescendo",
     "instructions": "Empieza fuerte y decrece suavemente hasta apagar el sonido.",
     "duration": 60, "type": "sustain"},
    {"id": "d4", "phase": "Dinámica", "title": "Messa di voce",
     "instructions": "Piano → forte → piano en una sola respiración. Registro medio.",
     "duration": 60, "type": "sustain"},
    {"id": "d5", "phase": "Dinámica", "title": "Messa di voce en agudo",
     "instructions": "Mismo ejercicio en tu registro agudo cómodo.",
     "duration": 60, "type": "sustain"},

    # FASE 5 — VIBRATO (3 min)
    {"id": "v1", "phase": "Vibrato", "title": "Vibrato lento controlado",
     "instructions": "Sostén una nota con vibrato amplio y lento (4-5 Hz). Busca ondulación natural.",
     "duration": 60, "type": "vibrato"},
    {"id": "v2", "phase": "Vibrato", "title": "Vibrato rápido",
     "instructions": "Vibrato más acelerado (6-7 Hz). Observa si aparece tensión mandibular.",
     "duration": 60, "type": "vibrato"},
    {"id": "v3", "phase": "Vibrato", "title": "Recta → vibrato",
     "instructions": "Comienza con voz recta sin vibrato y entra al vibrato en el segundo 3-4.",
     "duration": 60, "type": "vibrato"},

    # FASE 6 — REGISTROS Y TÉCNICAS (5 min)
    {"id": "r1", "phase": "Registros", "title": "Voz de pecho sostenida",
     "instructions": "Canta en tu registro más grave con peso y resonancia de pecho.",
     "duration": 60, "type": "register"},
    {"id": "r2", "phase": "Registros", "title": "Transición pecho → mixta → cabeza",
     "instructions": "En un solo glissando atraviesa las zonas de paso. No escondas los quiebres.",
     "duration": 60, "type": "register"},
    {"id": "r3", "phase": "Registros", "title": "Falsete suave",
     "instructions": "Canta una melodía tranquila en falsete puro, como un susurro alto.",
     "duration": 60, "type": "register"},
    {"id": "r4", "phase": "Registros", "title": "Belt controlado",
     "instructions": "Belt en zona alta con apoyo. No grites, proyecta con peso.",
     "duration": 60, "type": "register"},
    {"id": "r5", "phase": "Registros", "title": "Quiebre intencional (yodel)",
     "instructions": "Alterna rápidamente entre pecho y falsete (estilo yodel mexicano/country).",
     "duration": 60, "type": "register"},

    # FASE 7 — EMOCIÓN E INTENCIÓN (5 min)
    {"id": "e1", "phase": "Emoción", "title": "Melancolía profunda",
     "instructions": "Canta: 'Ay, amor lejano, regresa a mí...' con dolor genuino y voz partida si nace.",
     "duration": 60, "type": "emotion"},
    {"id": "e2", "phase": "Emoción", "title": "Alegría plena",
     "instructions": "Frase libre con energía desbordante, risas incluidas entre frases.",
     "duration": 60, "type": "emotion"},
    {"id": "e3", "phase": "Emoción", "title": "Rabia contenida",
     "instructions": "Canta una frase con tensión y rabia apenas contenida. Permite el rasp natural.",
     "duration": 60, "type": "emotion"},
    {"id": "e4", "phase": "Emoción", "title": "Añoranza profunda",
     "instructions": "Frase lenta y reflexiva, con respiraciones audibles intencionales.",
     "duration": 60, "type": "emotion"},
    {"id": "e5", "phase": "Emoción", "title": "Susurro íntimo",
     "instructions": "Acércate al micrófono y susurra-canta una frase de amor muy íntima.",
     "duration": 60, "type": "emotion"},

    # FASE 8 — RANCHERA Y GRITO MEXICANO (4 min)
    {"id": "ra1", "phase": "Ranchera", "title": "Ayyyyy ranchero clásico",
     "instructions": "Grito ranchero largo con vibrato y quiebres característicos. Imagina a Vicente Fernández.",
     "duration": 60, "type": "genre"},
    {"id": "ra2", "phase": "Ranchera", "title": "Frase ranchera con rasgado rural",
     "instructions": "Canta una frase libre estilo ranchera con el rasp natural del campo.",
     "duration": 60, "type": "genre"},
    {"id": "ra3", "phase": "Ranchera", "title": "Jajajayyyy mariachi",
     "instructions": "Risa-grito característica del mariachi. Exagera la expresión.",
     "duration": 60, "type": "genre"},
    {"id": "ra4", "phase": "Ranchera", "title": "Copla ranchera libre",
     "instructions": "A capella, canta una copla ranchera que conozcas bien, con toda tu intención.",
     "duration": 60, "type": "genre"},

    # FASE 9 — ROCK Y GRASPY/RASP (3 min)
    {"id": "rk1", "phase": "Rock", "title": "Graspy sostenido",
     "instructions": "Nota sostenida con textura graspy/rasposa controlada. Sin dañar las cuerdas.",
     "duration": 60, "type": "genre"},
    {"id": "rk2", "phase": "Rock", "title": "Scream controlado",
     "instructions": "Grito rockero tipo Axl Rose o Chris Cornell. Con apoyo y filtro, no garganta pura.",
     "duration": 60, "type": "genre"},
    {"id": "rk3", "phase": "Rock", "title": "Frase rockera agresiva",
     "instructions": "Canta una frase libre con actitud rockera, fraseo agresivo y rasp intencional.",
     "duration": 60, "type": "genre"},

    # FASE 10 — FONÉTICA Y FRASEO (4 min)
    {"id": "p1", "phase": "Fonética", "title": "Vocales puras sostenidas",
     "instructions": "Sostén a-e-i-o-u, cada una 10 segundos, misma nota, misma intensidad.",
     "duration": 60, "type": "phonetic"},
    {"id": "p2", "phase": "Fonética", "title": "Consonantes percusivas",
     "instructions": "Articula 'pa-ta-ka, pa-ta-ka' a distintas velocidades cantando una melodía simple.",
     "duration": 60, "type": "phonetic"},
    {"id": "p3", "phase": "Fonética", "title": "Trabalenguas rítmico",
     "instructions": "Canta 'tres tristes tigres tragaban trigo en un trigal' en ritmo creciente.",
     "duration": 60, "type": "phonetic"},
    {"id": "p4", "phase": "Fonética", "title": "Lectura musicalizada",
     "instructions": "Lee musicalmente un párrafo de un libro cualquiera, como si fuera letra de canción.",
     "duration": 60, "type": "phonetic"},

    # FASE 11 — IMPROVISACIÓN Y ESPONTANEIDAD (2 min)
    {"id": "im1", "phase": "Improvisación", "title": "Improv libre en tu género",
     "instructions": "A capella, improvisa en el género que más dominas. Sin reglas.",
     "duration": 60, "type": "improv"},
    {"id": "im2", "phase": "Improvisación", "title": "Improv con emoción espontánea",
     "instructions": "Cierra los ojos y canta lo que sientas ahora mismo. Todo vale: quiebres, risas, silencios.",
     "duration": 60, "type": "improv"},
]

PHASES = [
    {"name": "Calentamiento", "target_min": 5},
    {"name": "Escalas", "target_min": 5},
    {"name": "Intervalos", "target_min": 4},
    {"name": "Dinámica", "target_min": 5},
    {"name": "Vibrato", "target_min": 3},
    {"name": "Registros", "target_min": 5},
    {"name": "Emoción", "target_min": 5},
    {"name": "Ranchera", "target_min": 4},
    {"name": "Rock", "target_min": 3},
    {"name": "Fonética", "target_min": 4},
    {"name": "Improvisación", "target_min": 2},
]

TOTAL_TARGET_SECONDS = sum(p["duration"] for p in PROMPTS)  # ~45 min
