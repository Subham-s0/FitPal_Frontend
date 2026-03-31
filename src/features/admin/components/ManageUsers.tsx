import { type ReactNode, useState } from "react";
import {
  MoreHorizontal,
  Search,
  Filter,
  UserX,
  UserCheck,
  Eye,
  Edit,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";

type ManagedUserStatus = "Active" | "Suspended";
type ManagedUserRole = "User" | "Gym Owner" | "Admin";

interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: ManagedUserRole;
  status: ManagedUserStatus;
  joined: string;
  avatar: string;
}

interface UserDetailItemProps {
  label: string;
  children: ReactNode;
}

const initialUsers: ManagedUser[] = [
  { id: 1, name: "Arun Sharma", email: "arun@example.com", role: "User", status: "Active", joined: "2024-01-15", avatar: "https://github.com/shadcn.png" },
  { id: 2, name: "FitZone Elite", email: "contact@fitzone.com", role: "Gym Owner", status: "Active", joined: "2023-11-20", avatar: "" },
  { id: 3, name: "John Doe", email: "john@example.com", role: "User", status: "Suspended", joined: "2024-02-10", avatar: "" },
  { id: 4, name: "Sarah Smith", email: "sarah@example.com", role: "Admin", status: "Active", joined: "2023-10-05", avatar: "" },
  { id: 5, name: "PowerHouse Gym", email: "admin@powerhouse.com", role: "Gym Owner", status: "Active", joined: "2023-12-01", avatar: "" },
];

const getUserInitials = (name: string) => name.substring(0, 2).toUpperCase();

const UserDetailItem = ({ label, children }: UserDetailItemProps) => (
  <div>
    <Label className="text-gray-500 text-xs uppercase">{label}</Label>
    <div className="mt-1 font-medium">{children}</div>
  </div>
);

const ManageUsers = () => {
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleStatusToggle = (id: number) => {
    setUsers((currentUsers) =>
      currentUsers.map((user) => {
        if (user.id !== id) {
          return user;
        }

        return {
          ...user,
          status: user.status === "Active" ? "Suspended" : "Active",
        };
      })
    );
  };

  const openViewDialog = (user: ManagedUser) => {
    setSelectedUser(user);
    setIsViewOpen(true);
  };

  const openEditDialog = (user: ManagedUser) => {
    setSelectedUser(user);
    setIsEditOpen(true);
  };

  const filteredUsers = users.filter((user) => {
    const normalizedSearch = searchTerm.toLowerCase();
    return user.name.toLowerCase().includes(normalizedSearch) || user.email.toLowerCase().includes(normalizedSearch);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
            Manage <span className="text-gradient-fire">Users</span>
          </h2>
          <p className="text-sm text-gray-400">View, edit, and manage system users</p>
        </div>
        <div className="flex w-full items-center gap-2 md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search users..."
              className="border-white/10 bg-[#111] pl-9 text-white focus:border-orange-600"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <Button variant="outline" className="border-white/10 bg-[#111] text-white hover:bg-white/5">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#111]">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-gray-400">User</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Role</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Joined</TableHead>
              <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id} className="border-white/5 hover:bg-white/[0.02]">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-white/10">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-orange-600 text-xs font-bold text-white">
                        {getUserInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-bold text-white">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-white/10 text-gray-300">{user.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={`${user.status === "Active" ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"} border-0`}
                  >
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm font-medium text-gray-400">{user.joined}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="border-white/10 bg-[#1a1a1a] text-gray-300">
                      <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-gray-500">Actions</DropdownMenuLabel>
                      <DropdownMenuItem className="cursor-pointer focus:bg-white/5 focus:text-white" onClick={() => openViewDialog(user)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer focus:bg-white/5 focus:text-white" onClick={() => openEditDialog(user)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit User
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem
                        className={`cursor-pointer focus:bg-white/5 ${user.status === "Active" ? "text-red-500 focus:text-red-500" : "text-green-500 focus:text-green-500"}`}
                        onClick={() => handleStatusToggle(user.id)}
                      >
                        {user.status === "Active" ? (
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

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="border-white/10 bg-[#111] text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription className="text-gray-400">
              Detailed view of the user&apos;s account information.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-6 py-4">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-20 w-20 border-2 border-orange-600">
                  <AvatarImage src={selectedUser.avatar} />
                  <AvatarFallback className="bg-orange-600 text-xl font-black text-white">
                    {getUserInitials(selectedUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3 className="text-xl font-bold">{selectedUser.name}</h3>
                  <p className="text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <div className="space-y-4 border-t border-white/10 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <UserDetailItem label="Role">{selectedUser.role}</UserDetailItem>
                  <UserDetailItem label="Status">
                    <span className={selectedUser.status === "Active" ? "text-green-500" : "text-red-500"}>
                      {selectedUser.status}
                    </span>
                  </UserDetailItem>
                  <UserDetailItem label="Joined Date">{selectedUser.joined}</UserDetailItem>
                  <UserDetailItem label="User ID">
                    <span className="font-mono text-xs text-gray-400">#{selectedUser.id}</span>
                  </UserDetailItem>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="border-white/10 bg-[#111] text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription className="text-gray-400">
              Make changes to the user&apos;s profile here. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-gray-400">Name</Label>
                <Input id="name" defaultValue={selectedUser.name} className="border-white/10 bg-white/5 focus:border-orange-600" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-gray-400">Email</Label>
                <Input id="email" defaultValue={selectedUser.email} className="border-white/10 bg-white/5 focus:border-orange-600" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role" className="text-gray-400">Role</Label>
                <select
                  id="role"
                  defaultValue={selectedUser.role}
                  className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 focus:ring-offset-[#111]"
                >
                  <option value="User">User</option>
                  <option value="Gym Owner">Gym Owner</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:bg-white/10 hover:text-white">
              Cancel
            </Button>
            <Button type="submit" className="bg-orange-600 text-white hover:bg-orange-700" onClick={() => setIsEditOpen(false)}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageUsers;
