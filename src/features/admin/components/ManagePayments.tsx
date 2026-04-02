import { useState } from 'react';
import { 
  MoreHorizontal, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Download
} from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";

// Mock Data
const initialPayments = [
  { id: "PAY-1001", user: "Arun Sharma", plan: "Elite Plan", amount: 3999, date: "2024-03-15", status: "Completed", method: "Khalti" },
  { id: "PAY-1002", user: "John Doe", plan: "Pro Plan", amount: 1999, date: "2024-03-14", status: "Pending", method: "E-Sewa" },
  { id: "PAY-1003", user: "Sarah Smith", plan: "Basic Plan", amount: 999, date: "2024-03-14", status: "Failed", method: "Khalti" },
  { id: "PAY-1004", user: "Mike Tyson", plan: "Elite Plan", amount: 3999, date: "2024-03-12", status: "Completed", method: "Card" },
  { id: "PAY-1005", user: "Emily Davis", plan: "Pro Plan", amount: 1999, date: "2024-03-10", status: "Cancelled", method: "E-Sewa" },
];

type ManagedPayment = (typeof initialPayments)[number];

const ManagePayments = () => {
  const payments = initialPayments;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<ManagedPayment | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const filteredPayments = payments.filter(payment => 
    payment.user.toLowerCase().includes(searchTerm.toLowerCase()) || 
    payment.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
      case 'Pending': return 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20';
      case 'Failed': return 'bg-red-500/10 text-red-500 hover:bg-red-500/20';
      case 'Cancelled': return 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Manage <span className="text-gradient-fire">Payments</span></h2>
          <p className="text-gray-400 text-sm">Track and manage all system transactions</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input 
              placeholder="Search payments..." 
              className="pl-9 bg-[#111] border-white/10 text-white focus:border-orange-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="border-white/10 bg-[#111] text-white hover:bg-white/5">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" className="border-white/10 bg-[#111] text-white hover:bg-white/5">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-[#111] overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Transaction ID</TableHead>
              <TableHead className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">User</TableHead>
              <TableHead className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Plan</TableHead>
              <TableHead className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Amount</TableHead>
              <TableHead className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Date</TableHead>
              <TableHead className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Status</TableHead>
              <TableHead className="text-right text-gray-400 font-bold uppercase text-[10px] tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.map((payment) => (
              <TableRow key={payment.id} className="border-white/5 hover:bg-white/[0.02]">
                <TableCell className="font-mono text-xs text-gray-400">
                  {payment.id}
                </TableCell>
                <TableCell>
                  <span className="font-bold text-white text-sm">{payment.user}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-300">{payment.plan}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-bold text-white">Rs. {payment.amount.toLocaleString()}</span>
                </TableCell>
                <TableCell className="text-gray-400 text-sm">
                  {payment.date}
                </TableCell>
                <TableCell>
                  <Badge 
                    className={`${getStatusColor(payment.status)} border-0`}
                  >
                    {payment.status}
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
                        onClick={() => { setSelectedPayment(payment); setIsViewOpen(true); }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem className="focus:bg-white/5 focus:text-white cursor-pointer">
                        <Download className="mr-2 h-4 w-4" />
                        Download Receipt
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* View Payment Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              Complete information about this payment.
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="grid gap-6 py-4">
              <div className="flex flex-col items-center gap-2 mb-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${
                  selectedPayment.status === 'Completed' ? 'bg-green-500/20 text-green-500' :
                  selectedPayment.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-500' :
                  selectedPayment.status === 'Failed' ? 'bg-red-500/20 text-red-500' :
                  'bg-orange-500/20 text-orange-400'
                }`}>
                  {selectedPayment.status === 'Completed' ? <CheckCircle className="w-8 h-8" /> :
                   selectedPayment.status === 'Pending' ? <AlertTriangle className="w-8 h-8" /> :
                   selectedPayment.status === 'Failed' ? <XCircle className="w-8 h-8" /> :
                   <AlertTriangle className="w-8 h-8" />}
                </div>
                <h3 className="text-2xl font-black">Rs. {selectedPayment.amount.toLocaleString()}</h3>
                <Badge className={`${getStatusColor(selectedPayment.status)} border-0`}>
                  {selectedPayment.status}
                </Badge>
              </div>
              
              <div className="space-y-4 border-t border-white/10 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-500 text-xs uppercase">Transaction ID</Label>
                    <p className="font-mono text-gray-300">{selectedPayment.id}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs uppercase">Date</Label>
                    <p className="text-gray-300">{selectedPayment.date}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs uppercase">User</Label>
                    <p className="text-gray-300">{selectedPayment.user}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs uppercase">Plan</Label>
                    <p className="text-gray-300">{selectedPayment.plan}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs uppercase">Payment Method</Label>
                    <p className="text-gray-300">{selectedPayment.method}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsViewOpen(false)} className="text-gray-400 hover:text-white hover:bg-white/10">Close</Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white">
              <Download className="w-4 h-4 mr-2" />
              Download Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagePayments;

