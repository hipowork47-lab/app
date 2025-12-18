// src/components/CategoryManagement.tsx
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Tag, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/store/store";

interface LocalCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
}

const colors = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#06B6D4", "#84CC16", "#F97316"
];

const CategoryManagement: React.FC = () => {
  const { state, dispatch } = useStore();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LocalCategory | null>(null);
  const [form, setForm] = useState({ name: "", description: "", color: colors[0] });

  const handleOpenAdd = () => {
    setEditing(null);
    setForm({ name: "", description: "", color: colors[0] });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast({ title: "خطأ", description: "أدخل اسم الفئة", variant: "destructive" });
      return;
    }

    if (editing) {
      dispatch({ type: "UPDATE_CATEGORY", payload: { ...editing, ...form } });
      toast({ title: "تم التحديث", description: `تم تعديل ${form.name}` });
    } else {
      const newCat: LocalCategory = { id: Date.now().toString(), ...form };
      dispatch({ type: "ADD_CATEGORY", payload: newCat });
      toast({ title: "تم الإضافة", description: `تم إضافة ${form.name}` });
    }

    setIsDialogOpen(false);
    setEditing(null);
    setForm({ name: "", description: "", color: colors[0] });
  };

  const handleEdit = (c: any) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description || "", color: c.color || colors[0] });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: "DELETE_CATEGORY", payload: id });
    toast({ title: "تم الحذف", description: "تم حذف الفئة" });
  };

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-blue-100">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Tag className="w-5 h-5" /> إدارة الفئات
          </CardTitle>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-to-r from-green-500 to-emerald-500" onClick={handleOpenAdd}>
                <Plus className="w-4 h-4 mr-2" /> إضافة فئة
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md" dir="rtl">
              <DialogHeader>
                <DialogTitle>{editing ? "تعديل الفئة" : "إضافة فئة جديدة"}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">اسم الفئة *</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>

                <div>
                  <Label>وصف (اختياري)</Label>
                  <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>

                <div>
                  <Label>اللون</Label>
                  <div className="flex gap-2 mt-2">
                    {colors.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, color: c })}
                        className={`w-8 h-8 rounded-full border ${form.color === c ? "border-gray-800" : "border-gray-300"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500">{editing ? "تحديث" : "إضافة"}</Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {(state.categories ?? []).map((category: any) => (
            <div key={category.id} className="p-3 bg-white rounded-lg border border-blue-100 flex items-center justify-between group hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                <div>
                  <span className="font-medium text-sm">{category.name}</span>
                  {category.description && <p className="text-xs text-gray-500">{category.description}</p>}
                </div>
              </div>

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="ghost" onClick={() => handleEdit(category)} className="h-6 w-6 p-0"><Edit className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(category.id)} className="h-6 w-6 p-0 text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
        </div>

        {(state.categories ?? []).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>لا توجد فئات محددة</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryManagement;
