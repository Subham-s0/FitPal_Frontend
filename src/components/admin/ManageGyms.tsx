import { useState } from 'react';
import { 
  MoreHorizontal, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Edit, 
  MapPin,
  Building2
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// Mock Data
const initialGyms = [
  { id: 1, name: "Iron Paradise", location: "Lazimpat, Kathmandu", owner: "Arun Sharma", status: "Active", joined: "2023-11-15", logo: "" },
  { id: 2, name: "FitZone Elite", location: "Jhamsikhel, Lalitpur", owner: "John Smith", status: "Active", joined: "2023-11-20", logo: "" },
  { id: 3, name: "New Age Fitness", location: "Baneshwor, Kathmandu", owner: "Sarah Connor", status: "Pending", joined: "2024-03-01", logo: "" },
  { id: 4, name: "PowerHouse", location: "Baluwatar, Kathmandu", owner: "Mike Tyson", status: "Active", joined: "2023-12-01", logo: "" },
  { id: 5, name: "Muscle Factory", location: "Thamel, Kathmandu", owner: "Arnold S.", status: "Suspended", joined: "2024-01-10", logo: "" },
];

const ManageGyms = () => {
  const [gyms, setGyms] = useState(initialGyms);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGym, setSelectedGym] = useState<ManagedGym | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleStatusChange = (id: number, newStatus: ManagedGymStatus) => {
    setGyms(gyms.map(gym => {
      if (gym.id === id) {
        return { ...gym, status: newStatus };
      }
      return gym;
    }));
  };

  const filteredGyms = gyms.filter(gym => 
    gym.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    gym.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gym.owner.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Manage <span className="text-gradient-fire">Gyms</span></h2>
          <p className="text-gray-400 text-sm">Approve, edit, and manage partner gyms</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input 
              placeholder="Search gyms..." 
              className="pl-9 bg-[#111] border-white/10 text-white focus:border-orange-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="border-white/10 bg-[#111] text-white hover:bg-white/5">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-[#111] overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Gym Name</TableHead>
              <TableHead className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Location</TableHead>
              <TableHead className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Owner</TableHead>
              <TableHead className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Status</TableHead>
              <TableHead className="text-right text-gray-400 font-bold uppercase text-[10px] tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGyms.map((gym) => (
              <TableRow key={gym.id} className="border-white/5 hover:bg-white/[0.02]">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8 rounded-lg border border-white/10">
                      <AvatarImage src={gym.logo} />
                      <AvatarFallback className="bg-white/5 text-gray-400 rounded-lg">
                        <Building2 className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-bold text-white text-sm">{gym.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <MapPin className="w-3 h-3" />
                    <span className="text-xs">{gym.location}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-300">{gym.owner}</span>
                </TableCell>
                <TableCell>
                  <Badge 
                    className={`${
                      gym.status === 'Active' 
                        ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' 
                        : gym.status === 'Pending'
                          ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'
                          : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                    } border-0`}
                  >
                    {gym.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-white/10 text-gray-300">
                      <DropdownMenuLabel className="text-gray-500 text-[10px] uppercase tracking-wider">Actions</DropdownMenuLabel>
                      <DropdownMenuItem 
                        className="focus:bg-white/5 focus:text-white cursor-pointer"
                        onClick={() => { setSelectedGym(gym); setIsViewOpen(true); }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="focus:bg-white/5 focus:text-white cursor-pointer"
                        onClick={() => { setSelectedGym(gym); setIsEditOpen(true); }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      {gym.status === 'Pending' && (
                        <DropdownMenuItem 
                          className="text-green-500 focus:text-green-500 focus:bg-white/5 cursor-pointer"
                          onClick={() => handleStatusChange(gym.id, 'Active')}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve Gym
                        </DropdownMenuItem>
                      )}
                      {gym.status !== 'Suspended' ? (
                        <DropdownMenuItem 
                          className="text-red-500 focus:text-red-500 focus:bg-white/5 cursor-pointer"
                          onClick={() => handleStatusChange(gym.id, 'Suspended')}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Suspend Gym
                        </DropdownMenuItem>
                      ) : (
                         <DropdownMenuItem 
                          className="text-green-500 focus:text-green-500 focus:bg-white/5 cursor-pointer"
                          onClick={() => handleStatusChange(gym.id, 'Active')}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Reactivate Gym
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* View Gym Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Gym Profile</DialogTitle>
            <DialogDescription className="text-gray-400">
              Detailed view of the gym's information.
            </DialogDescription>
          </DialogHeader>
          {selectedGym && (
            <div className="grid gap-6 py-4">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="w-20 h-20 rounded-2xl border-2 border-orange-600">
                  <AvatarImage src={selectedGym.logo} />
                  <AvatarFallback className="bg-white/5 text-gray-400 rounded-2xl">
                    <Building2 className="w-10 h-10" />
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3 className="text-xl font-bold">{selectedGym.name}</h3>
                  <div className="flex items-center justify-center gap-1.5 text-gray-500 mt-1">
                    <MapPin className="w-3 h-3" />
                    <span className="text-xs">{selectedGym.location}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4 border-t border-white/10 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500 text-xs uppercase">Owner</Label>
                    <p className="font-medium">{selectedGym.owner}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs uppercase">Status</Label>
                    <p className={`font-medium ${selectedGym.status === 'Active' ? 'text-green-500' : selectedGym.status === 'Pending' ? 'text-yellow-500' : 'text-red-500'}`}>
                      {selectedGym.status}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs uppercase">Joined Date</Label>
                    <p className="font-medium">{selectedGym.joined}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs uppercase">Gym ID</Label>
                    <p className="font-medium font-mono text-xs text-gray-400">#{selectedGym.id}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Gym Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Gym Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              Make changes to the gym's information here.
            </DialogDescription>
          </DialogHeader>
          {selectedGym && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="gymName" className="text-gray-400">Gym Name</Label>
                <Input id="gymName" defaultValue={selectedGym.name} className="bg-white/5 border-white/10 focus:border-orange-600" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location" className="text-gray-400">Location</Label>
                <Input id="location" defaultValue={selectedGym.location} className="bg-white/5 border-white/10 focus:border-orange-600" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="owner" className="text-gray-400">Owner Name</Label>
                <Input id="owner" defaultValue={selectedGym.owner} className="bg-white/5 border-white/10 focus:border-orange-600" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-white hover:bg-white/10">Cancel</Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => setIsEditOpen(false)}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageGyms;

