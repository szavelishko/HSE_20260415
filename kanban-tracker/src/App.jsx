import { useState } from 'react'
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, closestCorners } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import './App.css'

const COLUMNS = [
  { id: 'backlog', title: 'Бэклог', color: '#6366f1' },
  { id: 'in-progress', title: 'В работе', color: '#f59e0b' },
  { id: 'ready', title: 'Готово', color: '#10b981' },
  { id: 'waiting', title: 'Ожидание', color: '#8b5cf6' },
  { id: 'cancelled', title: 'Отменено', color: '#ef4444' },
]

const INITIAL_TASKS = {
  backlog: [
    { id: 'task-1', content: 'Изучить требования проекта' },
    { id: 'task-2', content: 'Спроектировать архитектуру' },
  ],
  'in-progress': [
    { id: 'task-3', content: 'Разработать UI компоненты' },
  ],
  ready: [
    { id: 'task-4', content: 'Настроить CI/CD пайплайн' },
  ],
  waiting: [
    { id: 'task-5', content: 'Ожидание ответа от клиента' },
  ],
  cancelled: [],
}

function TaskCard({ task, isOverlay }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`task-card ${isOverlay ? 'task-overlay' : ''}`}
    >
      <div className="task-content">{task.content}</div>
      <div className="task-drag-handle">⋮⋮</div>
    </div>
  )
}

function Column({ column, tasks, onAddTask, onDeleteTask }) {
  const { setNodeRef } = useSortable({ id: column.id })
  const [newTaskText, setNewTaskText] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = () => {
    if (newTaskText.trim()) {
      onAddTask(column.id, newTaskText.trim())
      setNewTaskText('')
      setIsAdding(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAdd()
    } else if (e.key === 'Escape') {
      setIsAdding(false)
      setNewTaskText('')
    }
  }

  return (
    <div className="column" style={{ borderColor: column.color }}>
      <div className="column-header" style={{ backgroundColor: column.color }}>
        <h3>{column.title}</h3>
        <span className="task-count">{tasks.length}</span>
      </div>
      <div ref={setNodeRef} className="column-body">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <div key={task.id} className="task-wrapper">
              <TaskCard task={task} />
              <button 
                className="delete-btn" 
                onClick={() => onDeleteTask(column.id, task.id)}
                aria-label="Удалить задачу"
              >
                ×
              </button>
            </div>
          ))}
        </SortableContext>
        
        {isAdding ? (
          <div className="add-task-form">
            <textarea
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Введите название задачи..."
              autoFocus
              rows={3}
            />
            <div className="form-actions">
              <button className="btn-save" onClick={handleAdd}>Добавить</button>
              <button className="btn-cancel" onClick={() => { setIsAdding(false); setNewTaskText('') }}>Отмена</button>
            </div>
          </div>
        ) : (
          <button className="add-task-btn" onClick={() => setIsAdding(true)}>
            + Добавить задачу
          </button>
        )}
      </div>
    </div>
  )
}

function App() {
  const [tasks, setTasks] = useState(INITIAL_TASKS)
  const [activeTask, setActiveTask] = useState(null)
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const findTaskById = (taskId) => {
    for (const column of Object.keys(tasks)) {
      const task = tasks[column].find(t => t.id === taskId)
      if (task) return { task, columnId: column }
    }
    return null
  }

  const handleDragStart = (event) => {
    const { active } = event
    const found = findTaskById(active.id)
    if (found) {
      setActiveTask(found.task)
    }
  }

  const handleDragOver = (event) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    const activeData = findTaskById(activeId)
    if (!activeData) return

    const { task: activeTask, columnId: sourceColumnId } = activeData

    let overColumnId = overId
    
    if (!Object.keys(tasks).includes(overId)) {
      const overData = findTaskById(overId)
      if (overData) {
        overColumnId = overData.columnId
      }
    }

    if (sourceColumnId !== overColumnId) {
      setTasks(prev => {
        const newTasks = { ...prev }
        newTasks[sourceColumnId] = prev[sourceColumnId].filter(t => t.id !== activeId)
        newTasks[overColumnId] = [...prev[overColumnId], activeTask]
        return newTasks
      })
    }
  }

  const handleDragEnd = (event) => {
    setActiveTask(null)
  }

  const handleAddTask = (columnId, content) => {
    const newTask = {
      id: `task-${Date.now()}`,
      content,
    }
    setTasks(prev => ({
      ...prev,
      [columnId]: [...prev[columnId], newTask],
    }))
  }

  const handleDeleteTask = (columnId, taskId) => {
    setTasks(prev => ({
      ...prev,
      [columnId]: prev[columnId].filter(t => t.id !== taskId),
    }))
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>📋 Канбан Доска</h1>
        <p className="subtitle">Управляйте задачами легко и эффективно</p>
      </header>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          {COLUMNS.map(column => (
            <Column
              key={column.id}
              column={column}
              tasks={tasks[column.id]}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
            />
          ))}
        </div>
        
        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} isOverlay />}
        </DragOverlay>
      </DndContext>
      
      <footer className="app-footer">
        <p>Перетаскивайте задачи между колонками для изменения статуса</p>
      </footer>
    </div>
  )
}

export default App
