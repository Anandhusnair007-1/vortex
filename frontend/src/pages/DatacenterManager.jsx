import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Layers, DoorOpen, Plus, Search, 
  MapPin, ChevronRight, MoreVertical, X,
  Terminal, Monitor, FileText, Settings2, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '../components';
import { 
  getBuildings,
  getFloors,
  getDoors,
  createBuilding,
  createFloor,
  createDoor,
  getGoldenImages,
  createGoldenImage,
  getCloudInitProfiles,
  createCloudInitProfile
} from '../services/api';
import { NodeRegistry } from '../components/NodeRegistry';

export function DatacenterManager() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('nodes'); // nodes, physical, templates
  const [view, setView] = useState('buildings'); // buildings, floors, doors, images, profiles
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [doors, setDoors] = useState([]);
  
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  
  const [images, setImages] = useState([]);
  const [profiles, setProfiles] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationForm, setLocationForm] = useState({ name: '', code: '', address: '', notes: '', level_number: '' });

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    try {
      if (view === 'buildings') {
        const created = await createBuilding({ 
          name: locationForm.name, 
          code: locationForm.code, 
          address: locationForm.address, 
          notes: locationForm.notes 
        });
        setBuildings(prev => [...prev, created]);
        toast.success(`Created building: ${created.name}`);
      } else if (view === 'floors') {
        if (!selectedBuilding) return;
        const created = await createFloor({ 
          building_id: selectedBuilding.id, 
          name: locationForm.name, 
          level_number: parseInt(locationForm.level_number, 10) || 0, 
          notes: locationForm.notes 
        });
        setFloors(prev => [...prev, created]);
        toast.success(`Created floor: ${created.name}`);
      } else if (view === 'doors') {
        if (!selectedFloor) return;
        const created = await createDoor({ 
          building_id: selectedBuilding.id, 
          floor_id: selectedFloor.id, 
          name: locationForm.name, 
          code: locationForm.code, 
          notes: locationForm.notes 
        });
        setDoors(prev => [...prev, created]);
        toast.success(`Created configuration for door: ${created.name}`);
      }
      setIsLocationModalOpen(false);
      setLocationForm({ name: '', code: '', address: '', notes: '', level_number: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to save location');
    }
  };

  const openLocationModal = () => {
    setLocationForm({ name: '', code: '', address: '', notes: '', level_number: '' });
    setIsLocationModalOpen(true);
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        if (view === 'buildings') {
          const data = await getBuildings();
          setBuildings(data);
        } else if (view === 'floors') {
          const data = await getFloors(selectedBuilding?.id);
          setFloors(data);
        } else if (view === 'doors') {
          const data = await getDoors(selectedFloor?.id);
          setDoors(data);
        } else if (view === 'images') {
          const data = await getGoldenImages();
          setImages(data);
        } else if (view === 'profiles') {
          const data = await getCloudInitProfiles();
          setProfiles(data);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [view, selectedBuilding, selectedFloor]);

  const navigateToFloors = (building) => {
    setSelectedBuilding(building);
    setView('floors');
    setSearchTerm('');
  };

  const navigateToDoors = (floor) => {
    setSelectedFloor(floor);
    setView('doors');
    setSearchTerm('');
  };

  const handleCreateGoldenImage = async () => {
    try {
      const name = prompt("Enter Image Display Name:");
      const template = prompt("Enter Proxmox Template Name (e.g. tpl-ubuntu-22-04):");
      if (!name || !template) return;
      const created = await createGoldenImage({ name, proxmox_template_name: template, os_type: 'linux' });
      setImages(prev => [...prev, created]);
      toast.success("Golden Image registered");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCreateProfile = async () => {
    try {
      const name = prompt("Enter Profile Name:");
      if (!name) return;
      const created = await createCloudInitProfile({ name, username: 'vortyx' });
      setProfiles(prev => [...prev, created]);
      toast.success("Cloud-Init Profile created");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const Breadcrumbs = () => (
    <div className="mb-6 flex items-center gap-2 text-xs text-vortyx-text-muted">
      <button 
        onClick={() => { setView('buildings'); setSelectedBuilding(null); setSelectedFloor(null); }}
        className={`hover:text-vortyx-accent ${view === 'buildings' ? 'font-bold text-vortyx-text-primary underline' : ''}`}
      >
        All Buildings
      </button>
      {selectedBuilding && (
        <>
          <ChevronRight className="h-3 w-3" />
          <button 
            onClick={() => { setView('floors'); setSelectedFloor(null); }}
            className={`hover:text-vortyx-accent ${view === 'floors' ? 'font-bold text-vortyx-text-primary underline' : ''}`}
          >
            {selectedBuilding.name}
          </button>
        </>
      )}
      {selectedFloor && (
        <>
          <ChevronRight className="h-3 w-3" />
          <span className="font-bold text-vortyx-text-primary">
            Floor {selectedFloor.level_number}: {selectedFloor.name}
          </span>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Infrastructure Hub" 
        subtitle="Manage Proxmox server nodes and map physical datacenter locations."
      />

      <div className="flex items-center gap-1 p-1 w-fit rounded-2xl bg-white/[0.03] border border-white/10">
        <button 
          onClick={() => setActiveTab('nodes')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === 'nodes' ? 'bg-vortyx-accent text-white shadow-lg' : 'text-vortyx-text-muted hover:text-vortyx-text-primary'}`}
        >
          Compute Nodes
        </button>
        <button 
          onClick={() => { setActiveTab('physical'); setView('buildings'); }}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === 'physical' ? 'bg-vortyx-accent text-white shadow-lg' : 'text-vortyx-text-muted hover:text-vortyx-text-primary'}`}
        >
          Location Registry
        </button>
        <button 
          onClick={() => { setActiveTab('templates'); setView('images'); }}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${activeTab === 'templates' ? 'bg-vortyx-accent text-white shadow-lg' : 'text-vortyx-text-muted hover:text-vortyx-text-primary'}`}
        >
          OS & Images
        </button>
      </div>

      {activeTab === 'nodes' && <NodeRegistry />}

      {activeTab === 'physical' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <Breadcrumbs />
            <button onClick={openLocationModal} className="vortyx-button-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add {view === 'buildings' ? 'Building' : view === 'floors' ? 'Floor' : 'Door'}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vortyx-text-muted" />
              <input 
                type="text"
                placeholder={`Search ${view}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="vortyx-input w-full pl-10"
              />
            </div>
          </div>

          {loading ? (
             <div className="flex h-64 items-center justify-center text-vortyx-text-muted">Loading registry...</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {view === 'buildings' && buildings.map(b => (
                <LocationCard 
                  key={b.id}
                  title={b.name}
                  code={b.code}
                  subtitle={b.address}
                  icon={Building2}
                  badge={`${b.floor_count || 0} Floors`}
                  onClick={() => navigateToFloors(b)}
                />
              ))}
              {view === 'floors' && floors.map(f => (
                <LocationCard 
                  key={f.id}
                  title={f.name}
                  code={`L${f.level_number}`}
                  subtitle={f.notes || "Infrastructure Floor"}
                  icon={Layers}
                  badge={`${f.door_count || 0} Doors`}
                  onClick={() => navigateToDoors(f)}
                />
              ))}
              {view === 'doors' && doors.map(d => (
                <div key={d.id} className="relative group">
                  <LocationCard 
                    title={d.name}
                    code={d.code}
                    subtitle={d.rfid_device ? `Linked Device: ${d.rfid_device.name}` : "No device mapped"}
                    icon={DoorOpen}
                    badge={d.rfid_device ? "Secured" : "Unmapped"}
                    interactive={!!d.rfid_device}
                    onClick={d.rfid_device ? () => navigate(`/rfid/devices/${d.rfid_device.id}`) : undefined}
                  />
                  {d.rfid_device && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`http://${d.rfid_device.ip_address}`, '_blank', 'noopener,noreferrer');
                      }}
                      className="absolute right-12 bottom-[18px] z-20 flex items-center gap-1 overflow-hidden h-7 w-7 hover:w-24 group/btn rounded-lg bg-vortyx-accent/10 px-2 text-[10px] font-bold text-vortyx-accent transition-all duration-300 hover:bg-vortyx-accent/20"
                      title="Open Device Web Interface"
                    >
                      <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap">WEB UI</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setView('images')}
                className={`text-sm font-bold transition ${view === 'images' ? 'text-vortyx-accent underline underline-offset-8' : 'text-vortyx-text-muted hover:text-white'}`}
              >
                Golden Images
              </button>
              <button 
                onClick={() => setView('profiles')}
                className={`text-sm font-bold transition ${view === 'profiles' ? 'text-vortyx-accent underline underline-offset-8' : 'text-vortyx-text-muted hover:text-white'}`}
              >
                Cloud-Init Profiles
              </button>
            </div>
            <button 
              onClick={view === 'images' ? handleCreateGoldenImage : handleCreateProfile}
              className="vortyx-button-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add {view === 'images' ? 'Image' : 'Profile'}
            </button>
          </div>

          {loading ? (
             <div className="flex h-64 items-center justify-center text-vortyx-text-muted">Loading templates...</div>
          ) : (
            <div className="grid gap-4">
              {view === 'images' && images.map(img => (
                <div key={img.id} className="vortyx-panel flex items-center justify-between p-4 hover:border-vortyx-accent/40 transition">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-vortyx-accent/10 p-2 text-vortyx-accent">
                      <Monitor className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-vortyx-text-primary">{img.name}</h4>
                      <p className="text-xs text-vortyx-text-muted">Proxmox Template: <code className="text-vortyx-accent">{img.proxmox_template_name}</code></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-vortyx-text-muted bg-white/5 px-2 py-1 rounded-lg">
                      {img.os_type}
                    </span>
                    <button className="text-vortyx-text-muted hover:text-white p-2">
                      <Settings2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {view === 'profiles' && profiles.map(prof => (
                <div key={prof.id} className="vortyx-panel flex items-center justify-between p-4 hover:border-vortyx-accent/40 transition">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-vortyx-accent/10 p-2 text-vortyx-accent">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-vortyx-text-primary">{prof.name}</h4>
                      <p className="text-xs text-vortyx-text-muted">Default User: <span className="text-white">{prof.username}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {prof.ssh_keys && (
                      <span className="text-[9px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">SSH ENABLED</span>
                    )}
                    <button className="text-vortyx-text-muted hover:text-white p-2">
                      <Settings2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {((view === 'images' && images.length === 0) || (view === 'profiles' && profiles.length === 0)) && (
                <div className="vortyx-panel flex flex-col items-center justify-center p-12 text-center border-dashed border-white/10">
                  <Terminal className="h-10 w-10 text-vortyx-text-muted mb-4 opacity-20" />
                  <h3 className="text-lg font-bold text-vortyx-text-secondary">No {view} found</h3>
                  <p className="max-w-xs text-sm text-vortyx-text-muted mt-1">Start by adding your first {view.slice(0, -1)} to begin dynamic provisioning.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-vortyx-bg/80 backdrop-blur-sm" onClick={() => setIsLocationModalOpen(false)} />
          <form onSubmit={handleSaveLocation} className="vortyx-panel relative z-10 w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <h3 className="text-lg font-bold text-vortyx-text-primary">
                Add {view === 'buildings' ? 'Building' : view === 'floors' ? 'Floor' : 'Door'}
              </h3>
              <button type="button" onClick={() => setIsLocationModalOpen(false)} className="rounded-lg p-2 text-vortyx-text-muted hover:bg-white/5 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-4 p-6">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-vortyx-text-secondary">Name</span>
                <input required className="vortyx-input w-full" value={locationForm.name} onChange={e => setLocationForm({...locationForm, name: e.target.value})} placeholder={view === 'buildings' ? 'e.g. Headquarters' : 'e.g. Main Entrance'} />
              </label>
              
              {view !== 'floors' && (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-vortyx-text-secondary">Code</span>
                  <input className="vortyx-input w-full" value={locationForm.code} onChange={e => setLocationForm({...locationForm, code: e.target.value})} placeholder="e.g. HQ-01" />
                </label>
              )}
              
              {view === 'floors' && (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-vortyx-text-secondary">Level Number</span>
                  <input required type="number" className="vortyx-input w-full" value={locationForm.level_number} onChange={e => setLocationForm({...locationForm, level_number: e.target.value})} placeholder="e.g. 1" />
                </label>
              )}
              
              {view === 'buildings' && (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-vortyx-text-secondary">Address</span>
                  <textarea className="vortyx-input w-full" value={locationForm.address} onChange={e => setLocationForm({...locationForm, address: e.target.value})} rows={2} placeholder="Optional address" />
                </label>
              )}
              
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-vortyx-text-secondary">Notes</span>
                <textarea className="vortyx-input w-full" value={locationForm.notes} onChange={e => setLocationForm({...locationForm, notes: e.target.value})} rows={2} placeholder="Optional notes" />
              </label>
            </div>
            
            <div className="flex items-center justify-end gap-3 border-t border-white/5 px-6 py-4 bg-black/20 rounded-b-2xl">
              <button type="button" onClick={() => setIsLocationModalOpen(false)} className="vortyx-btn-ghost">Cancel</button>
              <button type="submit" className="vortyx-btn-primary px-6">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function LocationCard({ title, code, subtitle, icon: Icon, badge, onClick, interactive = true }) {
  return (
    <article 
      onClick={interactive ? onClick : undefined}
      className={`vortyx-panel group p-5 transition-all duration-300 ${interactive ? 'cursor-pointer hover:border-vortyx-accent/40 hover:bg-white/[0.06] hover:translate-y-[-2px]' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className={`rounded-xl bg-vortyx-accent/10 p-3 text-vortyx-accent transition group-hover:scale-110`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-vortyx-text-muted">
            {code}
          </span>
          <button className="rounded-lg p-1.5 text-vortyx-text-muted hover:bg-white/10 hover:text-vortyx-text-primary">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-4">
        <h4 className="font-semibold text-vortyx-text-primary">{title}</h4>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-vortyx-text-secondary">
          <MapPin className="h-3 w-3" />
          <p className="truncate">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
        <span className="text-[11px] font-medium text-vortyx-accent">{badge}</span>
        {interactive && (
          <ChevronRight className="h-4 w-4 text-vortyx-text-muted transition group-hover:translate-x-1 group-hover:text-vortyx-accent" />
        )}
      </div>
    </article>
  );
}
