// src/data/index.js
// Ítems para CDV Fijo
const cdvfijoItems = {
    tecnico: [
        { id: 'tecnico-1', number: 1, label: 'Se están atendiendo las personas mayores acorde a los admitidos' },
        { id: 'tecnico-2', number: 2, label: 'La actividad ejecutada hace parte de los componentes de atención establecidos en la propuesta técnica' },
        { id: 'tecnico-3', number: 3, label: 'El profesional cumple con el perfil idóneo para la actividad ejecutada' },
        { id: 'tecnico-4', number: 4, label: 'La atención y/o la actividad del día iniciaron acorde al horario establecido' },
        { id: 'tecnico-5', number: 5, label: 'La metodología de la actividad ejecutada es dinámica, usa ayudas visuales o didácticas' },
        { id: 'tecnico-6', number: 6, label: 'El tiempo de dedicación a la atención de los beneficiarios es el idóneo para la ejecución de actividades' },
        { id: 'tecnico-7', number: 7, label: 'La actividad ejecutada está acorde al cronograma de actividades, agendas de trabajo y sus modificaciones' },
        { id: 'tecnico-8', number: 8, label: 'Se usó y diligenció de manera correcta el listado de asistencia' }
    ],
    nutricion: [
        { id: 'nutricion-1', number: 1, label: 'Las entrega de la ración son las adecuadas' },
        { id: 'nutricion-2', number: 2, label: 'La ración entregada fue acorde a la minuta establecida' },
        { id: 'nutricion-3', number: 3, label: 'El horario de preparación y entrega de la ración fue el establecido' },
        { id: 'nutricion-4', number: 4, label: 'El menaje de la ración es el correcto y garantiza la salubridad y características organolépticas' },
        { id: 'nutricion-5', number: 5, label: 'Se entregaron raciones a todos los asistentes' },
        { id: 'nutricion-6', number: 6, label: 'La calidad de la ración es óptima' }
    ],
    infraestructura: [
        { id: 'infraestructura-1', number: 1, label: 'Cuenta con ambientes limpios y sin malos olores, en debidas condiciones higiénico-sanitarias' },
        { id: 'infraestructura-2', number: 2, label: 'Cuenta con un área iluminada y ventilada para trabajo en grupo y actividades' },
        { id: 'infraestructura-3', number: 3, label: 'Cuenta con un ambiente para comedor con espacios limpios y cómodos para beneficiarios' },
        { id: 'infraestructura-4', number: 4, label: 'Cuenta con área para servicios generales y almacenamiento de elementos de aseo' },
        { id: 'infraestructura-5', number: 5, label: 'El espacio es accesible externa e internamente' },
        { id: 'infraestructura-6', number: 6, label: 'Cuenta con accesos, áreas de circulación y salidas señalizadas' },
        { id: 'infraestructura-7', number: 7, label: 'El espacio cuenta con iluminación natural, ventilación y temperatura adecuada' },
        { id: 'infraestructura-8', number: 8, label: 'Cuenta con pisos firmes, antideslizantes y continuos para prevenir caídas' },
        { id: 'infraestructura-9', number: 9, label: 'El centro de vida esta dotado con jabón y papel higiénico para los beneficiarios' }
    ]
};

// Ítems para CDV Parque/Espacio Comunitario
const cdvparqueItems = {
    tecnico: [
        { id: 'tecnico-1', number: 1, label: 'Se están atendiendo las personas mayores acorde a los admitidos' },
        { id: 'tecnico-2', number: 2, label: 'La actividad ejecutada hace parte de los componentes de atención establecidos en la propuesta técnica' },
        { id: 'tecnico-3', number: 3, label: 'El profesional cumple con el perfil idóneo para la actividad ejecutada' },
        { id: 'tecnico-4', number: 4, label: 'La atención y/o la actividad del día iniciaron acorde al horario establecido' },
        { id: 'tecnico-5', number: 5, label: 'La metodología de la actividad ejecutada es dinámica, usa ayudas visuales o didácticas' },
        { id: 'tecnico-6', number: 6, label: 'El tiempo de dedicación a la atención de los beneficiarios es el idóneo para la ejecución de actividades' },
        { id: 'tecnico-7', number: 7, label: 'La actividad ejecutada está acorde al cronograma de actividades, agendas de trabajo y sus modificaciones' },
        { id: 'tecnico-8', number: 8, label: 'Se usó y diligenció de manera correcta el listado de asistencia' }
    ],
    nutricion: [
        { id: 'nutricion-1', number: 1, label: 'Las condiciones de traslado de la merienda son las adecuadas' },
        { id: 'nutricion-2', number: 2, label: 'La merienda entregada cumple con la minuta establecida' },
        { id: 'nutricion-3', number: 3, label: 'El horario entrega de la merienda fue el establecido' },
        { id: 'nutricion-4', number: 4, label: 'El menaje la merienda es el correcto y garantiza la salubridad y características organolépticas' },
        { id: 'nutricion-5', number: 5, label: 'Se entregaron meriendas a todos los asistentes' },
        { id: 'nutricion-6', number: 6, label: 'La calidad de la merienda es óptima' }
    ],
    infraestructura: [
        { id: 'infraestructura-1', number: 1, label: 'El espacio comunitario se encuentra limpio y apto para la actividad' },
        { id: 'infraestructura-2', number: 2, label: 'El área de atención está protegida de condiciones ambientales adversas (sol directo, lluvia)' },
        { id: 'infraestructura-3', number: 3, label: 'El espacio cuenta con condiciones mínimas de seguridad física para los adultos mayores' },
        { id: 'infraestructura-4', number: 4, label: 'El espacio está libre de obstáculos que puedan causar caídas' }
    ]
};

// Función para obtener los datos del checklist según el tipo seleccionado
const getChecklistData = (tipoEspacio) => {
    const checklistData = [];
    
    if (tipoEspacio === 'cdvfijo') {
        // Centro de Vida Fijo
        checklistData.push({
            title: 'COMPONENTE TÉCNICO',
            items: cdvfijoItems.tecnico,
            maxPuntos: cdvfijoItems.tecnico.length * 100 // Máximo posible: 100 puntos por ítem
        });
        
        checklistData.push({
            title: 'COMPONENTE NUTRICIÓN Y ALIMENTACIÓN',
            items: cdvfijoItems.nutricion,
            maxPuntos: cdvfijoItems.nutricion.length * 100
        });
        
        checklistData.push({
            title: 'COMPONENTE DE INFRAESTRUCTURA Y DOTACIÓN',
            items: cdvfijoItems.infraestructura,
            maxPuntos: cdvfijoItems.infraestructura.length * 100
        });
    } else if (tipoEspacio === 'cdvparque') {
        // Centro de Vida Parque/Espacio Comunitario
        checklistData.push({
            title: 'COMPONENTE TÉCNICO',
            items: cdvparqueItems.tecnico,
            maxPuntos: cdvparqueItems.tecnico.length * 100
        });
        
        checklistData.push({
            title: 'COMPONENTE NUTRICIÓN Y ALIMENTACIÓN',
            items: cdvparqueItems.nutricion,
            maxPuntos: cdvparqueItems.nutricion.length * 100
        });
        
        checklistData.push({
            title: 'COMPONENTE DE INFRAESTRUCTURA Y DOTACIÓN',
            items: cdvparqueItems.infraestructura,
            maxPuntos: cdvparqueItems.infraestructura.length * 100
        });
    } else {
        // Tipo no especificado, usar ítems predeterminados de CDV fijo
        checklistData.push({
            title: 'COMPONENTE TÉCNICO',
            items: cdvfijoItems.tecnico,
            maxPuntos: cdvfijoItems.tecnico.length * 100
        });
        
        checklistData.push({
            title: 'COMPONENTE NUTRICIÓN Y ALIMENTACIÓN',
            items: cdvfijoItems.nutricion,
            maxPuntos: cdvfijoItems.nutricion.length * 100
        });
        
        checklistData.push({
            title: 'COMPONENTE DE INFRAESTRUCTURA Y DOTACIÓN',
            items: cdvfijoItems.infraestructura,
            maxPuntos: cdvfijoItems.infraestructura.length * 100
        });
    }
    
    return checklistData;
};

// Calcular el total máximo de puntos posibles según el tipo de espacio
const getMaxPuntosPosibles = (tipoEspacio) => {
    let total = 0;
    
    if (tipoEspacio === 'cdvfijo') {
        total += cdvfijoItems.tecnico.length * 100;
        total += cdvfijoItems.nutricion.length * 100;
        total += cdvfijoItems.infraestructura.length * 100;
    } else if (tipoEspacio === 'cdvparque') {
        total += cdvparqueItems.tecnico.length * 100;
        total += cdvparqueItems.nutricion.length * 100;
        total += cdvparqueItems.infraestructura.length * 100;
    } else {
        // Por defecto, usar CDV fijo
        total += cdvfijoItems.tecnico.length * 100;
        total += cdvfijoItems.nutricion.length * 100;
        total += cdvfijoItems.infraestructura.length * 100;
    }
    
    return total;
};

export { getChecklistData, getMaxPuntosPosibles };
export default getChecklistData;