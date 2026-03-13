import React, { useState } from 'react';
import { 
  MoreHorizontal, 
  Search, 
  Filter, 
  UserX, 
  UserCheck, 
  Eye, 
  Edit, 
  Trash2 
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Mock Data
const initialUsers = [
  { id: 1, name: "Arun Sharma", email: "arun@example.com", role: "User", status: "Active", joined: "2024-01-15", avatar: "https://github.com/shadcn.png" },
  { id: 2, name: "FitZone Elite", email: "contact@fitzone.com", role: "Gym Owner", status: "Active", joined: "2023-11-20", avatar: "" },
  { id: 3, name: "John Doe", email: "john@example.com", role: "User", status: "Suspended", joined: "2024-02-10", avatar: "" },
  { id: 4, name: "Sarah Smith", email: "sarah@example.com", role: "Admin", status: "Active", joined: "2023-10-05", avatar: "" },
  { id: 5, name: "PowerHouse Gym", email: "admin@powerhouse.com", role: "Gym Owner", status: "Active", joined: "2023-12-01", avatar: "" },
];

const ManageUsers = () => {
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleStatusToggle = (id: number) => {
    setUsers(users.map(user => {
      if (user.id === id) {
        return { ...user, status: user.status === 'Active' ? 'Suspended' : 'Active' };
      }
      return user;
    }));
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Manage <span className="text-gradient-fire">Users</span></h2>
          <p className="text-gray-400 text-sm">View, edit, and manage system users</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input 
              placeholder="Search users..." 
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
              <TableHead className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">User</TableHead>
              <TableHead className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Role</TableHead>
              <TableHead className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Status</TableHead>
              <TableHead className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Joined</TableHead>
              <TableHead className="text-right text-gray-400 font-bold uppercase text-[10px] tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id} className="border-white/5 hover:bg-white/[0.02]">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8 border border-white/10">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-orange-600 text-white font-bold text-xs">
                        {user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-white text-sm">{user.name}</p>
                      <p className="text-gray-500 text-xs">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-white/10 text-gray-300">
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    className={`${
                      user.status === 'Active' 
                        ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' 
                        : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                    } border-0`}
                  >
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-400 text-sm font-medium">
                  {user.joined}
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
                        onClick={() => { setSelectedUser(user); setIsViewOpen(true); }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="focus:bg-white/5 focus:text-white cursor-pointer"
                        onClick={() => { setSelectedUser(user); setIsEditOpen(true); }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem 
                        className={`focus:bg-white/5 cursor-pointer ${user.status === 'Active' ? 'text-red-500 focus:text-red-500' : 'text-green-500 focus:text-green-500'}`}
                        onClick={() => handleStatusToggle(user.id)}
                      >
                        {user.status === 'Active' ? (
                          <>
                            <UserX className="mr-2 h-4 w-4" />
                            Suspend User
                          </>
                        ) : (
                          <>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Activate User
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* View User Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription className="text-gray-400">
              Detailed view of the user's account information.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-6 py-4">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="w-20 h-20 border-2 border-orange-600">
                  <AvatarImage src={selectedUser.avatar} />
                  <AvatarFallback className="bg-orange-600 text-white font-black text-xl">
                    {selectedUser.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3 className="text-xl font-bold">{selectedUser.name}</h3>
                  <p className="text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <div className="space-y-4 border-t border-white/10 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500 text-xs uppercase">Role</Label>
                    <p className="font-medium">{selectedUser.role}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs uppercase">Status</Label>
                    <p className={`font-medium ${selectedUser.status === 'Active' ? 'text-green-500' : 'text-red-500'}`}>
                      {selectedUser.status}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs uppercase">Joined Date</Label>
                    <p className="font-medium">{selectedUser.joined}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs uppercase">User ID</Label>
                    <p className="font-medium font-mono text-xs text-gray-400">#{selectedUser.id}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription className="text-gray-400">
              Make changes to the user's profile here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-gray-400">Name</Label>
                <Input id="name" defaultValue={selectedUser.name} className="bg-white/5 border-white/10 focus:border-orange-600" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-gray-400">Email</Label>
                <Input id="email" defaultValue={selectedUser.email} className="bg-white/5 border-white/10 focus:border-orange-600" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role" className="text-gray-400">Role</Label>
                <select id="role" className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 focus:ring-offset-[#111]">
                  <option value="User" selected={selectedUser.role === 'User'}>User</option>
                  <option value="Gym Owner" selected={selectedUser.role === 'Gym Owner'}>Gym Owner</option>
                  <option value="Admin" selected={selectedUser.role === 'Admin'}>Admin</option>
                </select>
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

export default ManageUsers;
