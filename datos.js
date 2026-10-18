// ─── Datos del curso (lo único que hay que revisar cada año) ──────────────────
// Clases, itinerarios, profesorado con sus asignaturas, y los calendarios de Google de cada clase.
// El color de cada docente en el calendario se asigna solo (por orden alfabético).

const CLASS_ITINERARIES = {
    "1º Bach A": ["Humanidades y Ciencias Sociales (Todos)", "Desdoble"],
    "1º Bach B": ["Ciencias y Tecnología (Todos)", "Ciencias", "Tecnología"],
    "2º Bach A": ["Humanidades y Ciencias Sociales (Todos)", "Desdoble"],
    "2º Bach B": ["Ciencias y Tecnología (Todos)", "Ciencias", "Tecnología"]
};

const TEACHER_DATA = {
    "Rocío Cano González": {
        subjects: {
            "Historia de España": {
                "2º Bach A": ["Ciencias y Tecnología (Todos)"],
                "2º Bach B": ["Ciencias y Tecnología (Todos)"]
            }
        }
    },
    "Amalia Campos García": {
        subjects: {
            "Lengua Castellana y Literatura I": {
                "1º Bach A": ["Humanidades y Ciencias Sociales (Todos)", "Desdoble"],
                "1º Bach B": ["Ciencias y Tecnología (Todos)", "Ciencias", "Tecnología"]
            },
            "Lengua Castellana y Literatura II": {
                "2º Bach A": ["Humanidades y Ciencias Sociales (Todos)", "Desdoble"],
                "2º Bach B": ["Ciencias y Tecnología (Todos)", "Ciencias", "Tecnología"]
            },
            "Ampliación de Lengua": {
                "2º Bach A": ["Humanidades y Ciencias Sociales (Todos)"],
                "2º Bach B": ["Ciencias y Tecnología (Todos)"]
            }
        }
    },
    "Ana Felipe Casas": {
        subjects: {
            "Lengua Castellana y Literatura I": {
                "1º Bach A": ["Humanidades y Ciencias Sociales (Todos)", "Desdoble"],
                "1º Bach B": ["Ciencias y Tecnología (Todos)"]
            },
            "Lengua Castellana y Literatura II": {
                "2º Bach A": ["Humanidades y Ciencias Sociales (Todos)", "Desdoble"],
                "2º Bach B": ["Ciencias y Tecnología (Todos)"]
            },
            "Ampliación de Lengua": {
                "2º Bach A": ["Humanidades y Ciencias Sociales (Todos)"],
                "2º Bach B": ["Ciencias y Tecnología (Todos)"]
            }
        }
    },
    "Elena Martínez Leiva": {
        subjects: {
            "Biología": { "2º Bach B": ["Ciencias"] },
            "Biología, Geología y Ciencias Ambientales": { "1º Bach B": ["Ciencias"] },
            "Anatomía Aplicada": { "1º Bach B": ["Ciencias"] },
            "Ciencias de la Tierra y del Medio Ambiente": { "2º Bach B": ["Ciencias"] }
        }
    },
    "Margarita Luque Blanco": {
        subjects: {
            "Inglés I": {
                "1º Bach A": ["Humanidades y Ciencias Sociales (Todos)", "Desdoble"],
                "1º Bach B": ["Ciencias y Tecnología (Todos)"]
            },
            "Inglés II": {
                "2º Bach A": ["Humanidades y Ciencias Sociales (Todos)", "Desdoble"],
                "2º Bach B": ["Ciencias y Tecnología (Todos)"]
            }
        }
    },
    "Nuria González Ganfornina": {
        subjects: {
            "Inglés I": {
                "1º Bach A": ["Humanidades y Ciencias Sociales (Todos)", "Desdoble"],
                "1º Bach B": ["Ciencias y Tecnología (Todos)"]
            },
            "Inglés II": {
                "2º Bach A": ["Humanidades y Ciencias Sociales (Todos)", "Desdoble"],
                "2º Bach B": ["Ciencias y Tecnología (Todos)"]
            }
        }
    },
    "Graziella Rodríguez Macías": {
        subjects: {
            "Francés I": { "1º Bach A": ["Humanidades y Ciencias Sociales (Todos)"] },
            "Francés II": { "2º Bach A": ["Humanidades y Ciencias Sociales (Todos)"] }
        }
    },
    "Paco Morales Domínguez": {
        subjects: {
            "Matemáticas I": { "1º Bach B": ["Ciencias y Tecnología (Todos)"] },
            "Matemáticas II": { "2º Bach B": ["Tecnología"] },
            "Ampliación de Física": { "1º Bach B": ["Tecnología"] },
            "Física": { "2º Bach B": ["Tecnología"] },
            "Dibujo Técnico I": { "1º Bach B": ["Tecnología"] },
            "Dibujo Técnico II": { "2º Bach B": ["Tecnología"] }
        }
    },
    "Pablo Bermejo González": {
        subjects: {
            "Cultura emprendedora y empresarial": { "1º Bach B": ["Ciencias y Tecnología (Todos)"] }
        }
    },
    "Mario Espejo Palacios": {
        subjects: {
            "Matemáticas aplicadas a las Ciencias Sociales I": { "1º Bach A": ["Humanidades y Ciencias Sociales (Todos)"] },
            "Economía": { "1º Bach A": ["Humanidades y Ciencias Sociales (Todos)"] },
            "Empresa y Diseño de Modelos de Negocio": { "2º Bach A": ["Humanidades y Ciencias Sociales (Todos)"] },
            "Cultura emprendedora y empresarial": { "1º Bach A": ["Humanidades y Ciencias Sociales (Todos)"] }
        }
    },
    "Mª Ángeles Chávez Ramos": {
        subjects: {
            "Física y Química": { "1º Bach B": ["Ciencias y Tecnología (Todos)"] },
            "Química": { "2º Bach B": ["Ciencias"] }
        }
    },
    "Pepa Laguna Ortíz": {
        subjects: {
            "Filosofía": {
                "1º Bach A": ["Humanidades y Ciencias Sociales (Todos)"],
                "1º Bach B": ["Ciencias y Tecnología (Todos)"]
            },
            "Historia de la Filosofía": {
                "2º Bach A": ["Humanidades y Ciencias Sociales (Todos)"],
                "2º Bach B": ["Ciencias y Tecnología (Todos)"]
            }
        }
    },
    "Carlos Sánchez Cabrera": {
        subjects: {
            "Matemáticas aplicadas a las Ciencias Sociales II": { "2º Bach A": ["Humanidades y Ciencias Sociales (Todos)"] }
        }
    },
    "Isabel Cortés Moreno": {
        subjects: {
            "Matemáticas aplicadas a las Ciencias Sociales II": { "2º Bach B": ["Ciencias"] }
        }
    },
    "Ana María Gallardo Pinto": {
        subjects: {
            "Geografía": { "2º Bach A": ["Humanidades y Ciencias Sociales (Todos)"] }
        }
    }
};

// IDs reales de los 4 calendarios de Google (uno por clase).
const CALENDAR_IDS = {
    "1º Bach A": "c_8c3993fe0d844b4f3fa5d8a18a30ee96242c3576bfc158c11aeb2fa67bd2586a@group.calendar.google.com",
    "1º Bach B": "c_de47733cf4131f0de112e04f086f1a58dcc94387743806a10291ad9c5dae4c1e@group.calendar.google.com",
    "2º Bach A": "c_f156f263656cdc96ad68d5212bbc1a1d4485f52bc70c7a3bca53dd7545f73934@group.calendar.google.com",
    "2º Bach B": "c_44edb9cfb0a13ebac79e26eea7f910afe300725fea3722bc415c10c33e377572@group.calendar.google.com"
};
