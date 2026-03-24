import React, { useEffect } from 'react';
import { useTaskStore } from '../store';
import { tasksAPI } from '../api';
import { FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getStatusColor } from '../utils/constants';

export const TasksPage = () => {
  const { myTasks, setMyTasks, setLoading } = useTaskStore();
  const [filter, setFilter] = React.useState('pending');

  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(true);
        const response = await tasksAPI.getMyTasks(0, 50, filter === 'all' ? null : filter);
        setMyTasks(response.data);
      } catch (error) {
        toast.error('Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [filter]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await tasksAPI.update(taskId, { status: newStatus });
      const updatedTasks = myTasks.map(t =>
        t.id === taskId ? { ...t, status: newStatus } : t
      );
      setMyTasks(updatedTasks);
      toast.success(`Task marked as ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await tasksAPI.delete(taskId);
      setMyTasks(myTasks.filter(t => t.id !== taskId));
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">My Tasks</h1>
        <p className="text-slate-600">{myTasks.length} task(s)</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['all', 'pending', 'in_progress', 'completed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
          >
            {f.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {myTasks.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-slate-600">No tasks yet. Great job!</p>
          </div>
        ) : (
          myTasks.map(task => (
            <div key={task.id} className="card">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900">{task.title}</h3>
                    <span
                      className={`badge text-xs capitalize ${getStatusColor(task.status)}`}
                    >
                      {task.status}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-sm text-slate-600 mb-3">{task.description}</p>
                  )}
                  <div className="flex gap-4 text-xs text-slate-500">
                    {task.created_at && (
                      <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
                    )}
                    {task.priority && (
                      <span className="capitalize">Priority: {task.priority}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {task.status !== 'completed' && task.status !== 'failed' && (
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                      className="input py-1 text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                    </select>
                  )}
                  {task.status === 'pending' && (
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="btn-sm btn-secondary"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
