"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  Plus, 
  Edit, 
  Trash2, 
  Image, 
  FileText, 
  Users, 
  Shield, 
  Wifi, 
  Tv, 
  CheckCircle, 
  X,
  Globe,
  MapPin,
  Phone, 
  Mail, 
  MessageCircle,
  Clock, 
  Settings,
  Palette,
  Type
} from "lucide-react";
import { apiRequest } from "@/lib/config/api";
import { useToast } from "@/app/components/shared/Toast";

interface SitioWebData {
  informacion: {
    titulo: string;
    subtitulo: string;
    descripcion: string;
    lema: string;
  };
  empresa: {
    nombre: string;
    direccion: string;
    telefono: string;
    email: string;
    ruc: string;
    horario: string;
  };
  servicios: Array<{
    id?: number;
    nombre: string;
    descripcion: string;
    icono: string;
    imagen: string;
    activo: boolean;
    orden: number;
  }>;
  planes: Array<{
    id?: number;
    nombre: string;
    velocidad: string;
    precio: number;
    descripcion: string;
    caracteristicas: string[];
    popular: boolean;
    activo: boolean;
    orden: number;
  }>;
  coberturas: Array<{
    id?: number;
    zona: string;
    descripcion: string;
    coordenadas: { lat: number; lng: number };
    activo: boolean;
    orden: number;
  }>;
  contactos: Array<{
    id?: number;
    tipo: string;
    titulo: string;
    valor: string;
    icono: string;
    url: string;
    activo: boolean;
    orden: number;
  }>;
  carrusel: Array<{
    id?: number;
    titulo: string;
    descripcion: string;
    imagen: string;
    video: string;
    enlace: string;
    activo: boolean;
    orden: number;
  }>;
  header: {
    logo_url: string;
    logo_alt: string;
    mostrar_menu: boolean;
    color_fondo: string;
    color_texto: string;
  };
  footer: {
    texto_copyright: string;
    mostrar_redes_sociales: boolean;
    mostrar_contacto: boolean;
    color_fondo: string;
    color_texto: string;
  };
  redesSociales: {
    [key: string]: string;
  };
  configuracion: {
    mostrar_precios: boolean;
    mostrar_contacto: boolean;
    mostrar_testimonios: boolean;
    modo_mantenimiento: boolean;
  };
}

export default function SitioWebPage() {
  const { toast } = useToast()
  const [formData, setFormData] = useState<SitioWebData>({
    informacion: {
      titulo: "",
      subtitulo: "",
      descripcion: "",
      lema: "",
    },
    empresa: {
      nombre: "",
      direccion: "",
      telefono: "",
      email: "",
      ruc: "",
      horario: "",
    },
    servicios: [],
    planes: [],
    coberturas: [],
    contactos: [],
    carrusel: [],
    header: {
      logo_url: "",
      logo_alt: "",
      mostrar_menu: true,
      color_fondo: "#ffffff",
      color_texto: "#000000",
    },
    footer: {
      texto_copyright: "",
      mostrar_redes_sociales: true,
      mostrar_contacto: true,
      color_fondo: "#1f2937",
      color_texto: "#ffffff",
    },
    redesSociales: {},
    configuracion: {
      mostrar_precios: true,
      mostrar_contacto: true,
      mostrar_testimonios: true,
      modo_mantenimiento: false,
    },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    fetchSitioWebData();
  }, []);

  const fetchSitioWebData = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("/sitio-web/configuracion/");
      if (response.success) {
        setFormData(response.data);
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    try {
      setSaving(true);
      const response = await apiRequest("/sitio-web/configuracion/", {
        method: "PUT",
        body: JSON.stringify({
          informacion: formData.informacion,
          empresa: formData.empresa,
          header: formData.header,
          footer: formData.footer,
          redesSociales: formData.redesSociales,
          configuracion: formData.configuracion,
        })
      });
      
      if (response.success) {
        toast("Información general guardada exitosamente", "success");
      }
    } catch (error) {
      console.error("Error al guardar:", error);
      toast("Error al guardar los datos", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveServicios = async () => {
    try {
      setSaving(true);
      const response = await apiRequest("/sitio-web/configuracion/", {
        method: "PUT",
        body: JSON.stringify({
          servicios: formData.servicios,
        })
      });
      
      if (response.success) {
        toast("Servicios guardados exitosamente", "success");
      }
    } catch (error) {
      console.error("Error al guardar:", error);
      toast("Error al guardar los servicios", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePlanes = async () => {
    try {
      setSaving(true);
      const response = await apiRequest("/sitio-web/configuracion/", {
        method: "PUT",
        body: JSON.stringify({
          planes: formData.planes,
        })
      });
      
      if (response.success) {
        toast("Planes guardados exitosamente", "success");
      }
    } catch (error) {
      console.error("Error al guardar:", error);
      toast("Error al guardar los planes", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCoberturas = async () => {
    try {
      setSaving(true);
      const response = await apiRequest("/sitio-web/configuracion/", {
        method: "PUT",
        body: JSON.stringify({
          coberturas: formData.coberturas,
        })
      });
      
      if (response.success) {
        toast("Coberturas guardadas exitosamente", "success");
      }
    } catch (error) {
      console.error("Error al guardar:", error);
      toast("Error al guardar las coberturas", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContactos = async () => {
    try {
      setSaving(true);
      const response = await apiRequest("/sitio-web/configuracion/", {
        method: "PUT",
        body: JSON.stringify({
          contactos: formData.contactos,
        })
      });
      
      if (response.success) {
        toast("Contactos guardados exitosamente", "success");
      }
    } catch (error) {
      console.error("Error al guardar:", error);
      toast("Error al guardar los contactos", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCarrusel = async () => {
    try {
      setSaving(true);
      const response = await apiRequest("/sitio-web/configuracion/", {
        method: "PUT",
        body: JSON.stringify({
          carrusel: formData.carrusel,
        })
      });
      
      if (response.success) {
        toast("Carrusel guardado exitosamente", "success");
      }
    } catch (error) {
      console.error("Error al guardar:", error);
      toast("Error al guardar el carrusel", "error");
    } finally {
      setSaving(false);
    }
  };

  const addServicio = () => {
    setFormData(prev => ({
      ...prev,
      servicios: [...prev.servicios, {
        nombre: "",
        descripcion: "",
        icono: "",
        imagen: "",
        activo: true,
        orden: prev.servicios.length,
      }]
    }));
  };

  const removeServicio = (index: number) => {
    setFormData(prev => ({
      ...prev,
      servicios: prev.servicios.filter((_, i) => i !== index)
    }));
  };

  const updateServicio = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      servicios: prev.servicios.map((servicio, i) => 
        i === index ? { ...servicio, [field]: value } : servicio
      )
    }));
  };

  const addPlan = () => {
    setFormData(prev => ({
      ...prev,
      planes: [...prev.planes, {
        nombre: "",
        velocidad: "",
        precio: 0,
        descripcion: "",
        caracteristicas: [],
        popular: false,
        activo: true,
        orden: prev.planes.length,
      }]
    }));
  };

  const removePlan = (index: number) => {
    setFormData(prev => ({
      ...prev,
      planes: prev.planes.filter((_, i) => i !== index)
    }));
  };

  const updatePlan = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      planes: prev.planes.map((plan, i) => 
        i === index ? { ...plan, [field]: value } : plan
      )
    }));
  };

  const addCobertura = () => {
    setFormData(prev => ({
      ...prev,
      coberturas: [...prev.coberturas, {
        zona: "",
        descripcion: "",
        coordenadas: { lat: 0, lng: 0 },
        activo: true,
        orden: prev.coberturas.length,
      }]
    }));
  };

  const removeCobertura = (index: number) => {
    setFormData(prev => ({
      ...prev,
      coberturas: prev.coberturas.filter((_, i) => i !== index)
    }));
  };

  const updateCobertura = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      coberturas: prev.coberturas.map((cobertura, i) => 
        i === index ? { ...cobertura, [field]: value } : cobertura
      )
    }));
  };

  const addContacto = () => {
    setFormData(prev => ({
      ...prev,
      contactos: [...prev.contactos, {
        tipo: "telefono",
        titulo: "",
        valor: "",
        icono: "",
        url: "",
        activo: true,
        orden: prev.contactos.length,
      }]
    }));
  };

  const removeContacto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contactos: prev.contactos.filter((_, i) => i !== index)
    }));
  };

  const updateContacto = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      contactos: prev.contactos.map((contacto, i) => 
        i === index ? { ...contacto, [field]: value } : contacto
      )
    }));
  };

  const addCarrusel = () => {
    setFormData(prev => ({
      ...prev,
      carrusel: [...prev.carrusel, {
        titulo: "",
        descripcion: "",
        imagen: "",
        video: "",
        enlace: "",
        activo: true,
        orden: prev.carrusel.length,
      }]
    }));
  };

  const removeCarrusel = (index: number) => {
    setFormData(prev => ({
      ...prev,
      carrusel: prev.carrusel.filter((_, i) => i !== index)
    }));
  };

  const updateCarrusel = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      carrusel: prev.carrusel.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg">Cargando configuración del sitio web...</p>
          </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración del Sitio Web</h1>
          <p className="text-gray-600 mt-2">Gestiona todo el contenido de tu sitio web público</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchSitioWebData}>
            <FileText className="w-4 h-4 mr-2" />
            Recargar
                  </Button>
                </div>
            </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="servicios">Servicios</TabsTrigger>
          <TabsTrigger value="planes">Planes</TabsTrigger>
          <TabsTrigger value="cobertura">Cobertura</TabsTrigger>
          <TabsTrigger value="contacto">Contacto</TabsTrigger>
          <TabsTrigger value="carrusel">Carrusel</TabsTrigger>
        </TabsList>

        {/* Pestaña General */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="w-5 h-5 mr-2" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="titulo">Título Principal</Label>
                  <Input
                    id="titulo"
                    value={formData.informacion.titulo}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      informacion: { ...prev.informacion, titulo: e.target.value }
                    }))}
                  />
              </div>
                <div>
                  <Label htmlFor="subtitulo">Subtítulo</Label>
                  <Input
                    id="subtitulo"
                    value={formData.informacion.subtitulo}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      informacion: { ...prev.informacion, subtitulo: e.target.value }
                    }))}
                  />
              </div>
            </div>
              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.informacion.descripcion}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    informacion: { ...prev.informacion, descripcion: e.target.value }
                  }))}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="lema">Lema</Label>
                <Input
                  id="lema"
                  value={formData.informacion.lema}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    informacion: { ...prev.informacion, lema: e.target.value }
                  }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Información de Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="empresa-nombre">Nombre de la Empresa</Label>
                  <Input
                    id="empresa-nombre"
                    value={formData.empresa.nombre}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      empresa: { ...prev.empresa, nombre: e.target.value }
                    }))}
                  />
                  </div>
                <div>
                  <Label htmlFor="empresa-telefono">Teléfono</Label>
                  <Input
                    id="empresa-telefono"
                    value={formData.empresa.telefono}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      empresa: { ...prev.empresa, telefono: e.target.value }
                    }))}
                  />
                  </div>
                  </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="empresa-email">Email</Label>
                  <Input
                    id="empresa-email"
                    type="email"
                    value={formData.empresa.email}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      empresa: { ...prev.empresa, email: e.target.value }
                    }))}
                  />
                  </div>
                <div>
                  <Label htmlFor="empresa-ruc">RUC</Label>
                  <Input
                    id="empresa-ruc"
                    value={formData.empresa.ruc}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      empresa: { ...prev.empresa, ruc: e.target.value }
                    }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="empresa-direccion">Dirección</Label>
                <Input
                  id="empresa-direccion"
                  value={formData.empresa.direccion}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    empresa: { ...prev.empresa, direccion: e.target.value }
                  }))}
                />
            </div>
              <div>
                <Label htmlFor="empresa-horario">Horario de Atención</Label>
                <Input
                  id="empresa-horario"
                  value={formData.empresa.horario}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    empresa: { ...prev.empresa, horario: e.target.value }
                  }))}
                />
          </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="w-5 h-5 mr-2" />
                Header y Footer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Header</h3>
                  <div>
                    <Label htmlFor="header-logo">URL del Logo</Label>
                    <Input
                      id="header-logo"
                      value={formData.header.logo_url}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        header: { ...prev.header, logo_url: e.target.value }
                      }))}
                    />
        </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.header.mostrar_menu}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        header: { ...prev.header, mostrar_menu: checked }
                      }))}
                    />
                    <Label>Mostrar menú</Label>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold">Footer</h3>
                  <div>
                    <Label htmlFor="footer-copyright">Texto de Copyright</Label>
                    <Input
                      id="footer-copyright"
                      value={formData.footer.texto_copyright}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        footer: { ...prev.footer, texto_copyright: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.footer.mostrar_redes_sociales}
                      onCheckedChange={(checked) => setFormData(prev => ({
                        ...prev,
                        footer: { ...prev.footer, mostrar_redes_sociales: checked }
                      }))}
                    />
                    <Label>Mostrar redes sociales</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveGeneral} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </TabsContent>

        {/* Pestaña Servicios */}
        <TabsContent value="servicios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Wifi className="w-5 h-5 mr-2" />
                  Servicios
                  </div>
                <Button onClick={addServicio}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Servicio
                </Button>
              </CardTitle>
                </CardHeader>
            <CardContent className="space-y-4">
              {formData.servicios.map((servicio, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Servicio {index + 1}</h3>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4" />
                  </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeServicio(index)}>
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
          </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nombre</Label>
                      <Input
                        value={servicio.nombre}
                        onChange={(e) => updateServicio(index, "nombre", e.target.value)}
                      />
        </div>
                    <div>
                      <Label>Icono</Label>
                      <Input
                        value={servicio.icono}
                        onChange={(e) => updateServicio(index, "icono", e.target.value)}
                        placeholder="wifi, tv, shield, etc."
                      />
          </div>
                  </div>
                  <div>
                    <Label>Descripción</Label>
                    <Textarea
                      value={servicio.descripcion}
                      onChange={(e) => updateServicio(index, "descripcion", e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>URL de Imagen</Label>
                    <Input
                      value={servicio.imagen}
                      onChange={(e) => updateServicio(index, "imagen", e.target.value)}
                      placeholder="https://ejemplo.com/imagen.jpg"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={servicio.activo}
                      onCheckedChange={(checked) => updateServicio(index, "activo", checked)}
                    />
                    <Label>Activo</Label>
                  </div>
                </div>
              ))}
              {formData.servicios.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay servicios configurados. Agrega el primero.
                </div>
              )}
                </CardContent>
              </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveServicios} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Guardando..." : "Guardar Servicios"}
            </Button>
          </div>
        </TabsContent>

        {/* Pestaña Planes */}
        <TabsContent value="planes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Planes de Internet
                  </div>
                <Button onClick={addPlan}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Plan
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.planes.map((plan, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Plan {index + 1}</h3>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar plan?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removePlan(index)}>
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                      <Label>Nombre</Label>
                      <Input
                        value={plan.nombre}
                        onChange={(e) => updatePlan(index, "nombre", e.target.value)}
                      />
                  </div>
                    <div>
                      <Label>Velocidad</Label>
                      <Input
                        value={plan.velocidad}
                        onChange={(e) => updatePlan(index, "velocidad", e.target.value)}
                        placeholder="30 MB"
                      />
          </div>
                    <div>
                      <Label>Precio ($)</Label>
                      <Input
                        type="number"
                        value={plan.precio}
                        onChange={(e) => updatePlan(index, "precio", parseFloat(e.target.value) || 0)}
                      />
        </div>
                </div>
                  <div>
                    <Label>Descripción</Label>
                    <Textarea
                      value={plan.descripcion}
                      onChange={(e) => updatePlan(index, "descripcion", e.target.value)}
                      rows={3}
                    />
                </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={plan.popular}
                      onCheckedChange={(checked) => updatePlan(index, "popular", checked)}
                    />
                    <Label>Plan Popular</Label>
                </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={plan.activo}
                      onCheckedChange={(checked) => updatePlan(index, "activo", checked)}
                    />
                    <Label>Activo</Label>
                </div>
              </div>
              ))}
              {formData.planes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay planes configurados. Agrega el primero.
            </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSavePlanes} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Guardando..." : "Guardar Planes"}
            </Button>
                </div>
        </TabsContent>

        {/* Pestaña Cobertura */}
        <TabsContent value="cobertura" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Zonas de Cobertura
                </div>
                <Button onClick={addCobertura}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Zona
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.coberturas.map((cobertura, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Zona {index + 1}</h3>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar zona?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeCobertura(index)}>
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nombre de la Zona</Label>
                      <Input
                        value={cobertura.zona}
                        onChange={(e) => updateCobertura(index, "zona", e.target.value)}
                      />
                </div>
                    <div>
                      <Label>Latitud</Label>
                      <Input
                        type="number"
                        step="any"
                        value={cobertura.coordenadas.lat}
                        onChange={(e) => updateCobertura(index, "coordenadas", {
                          ...cobertura.coordenadas,
                          lat: parseFloat(e.target.value) || 0
                        })}
                      />
                </div>
              </div>
                  <div>
                    <Label>Descripción</Label>
                    <Textarea
                      value={cobertura.descripcion}
                      onChange={(e) => updateCobertura(index, "descripcion", e.target.value)}
                      rows={3}
                    />
            </div>
                  <div>
                    <Label>Longitud</Label>
                    <Input
                      type="number"
                      step="any"
                      value={cobertura.coordenadas.lng}
                      onChange={(e) => updateCobertura(index, "coordenadas", {
                        ...cobertura.coordenadas,
                        lng: parseFloat(e.target.value) || 0
                      })}
                    />
          </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={cobertura.activo}
                      onCheckedChange={(checked) => updateCobertura(index, "activo", checked)}
                    />
                    <Label>Activo</Label>
        </div>
          </div>
              ))}
              {formData.coberturas.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay zonas de cobertura configuradas. Agrega la primera.
                  </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveCoberturas} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Guardando..." : "Guardar Coberturas"}
                    </Button>
                  </div>
        </TabsContent>

        {/* Pestaña Contacto */}
        <TabsContent value="contacto" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Phone className="w-5 h-5 mr-2" />
                  Información de Contacto
                  </div>
                <Button onClick={addContacto}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Contacto
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.contactos.map((contacto, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Contacto {index + 1}</h3>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar contacto?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeContacto(index)}>
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <Label>Tipo</Label>
                      <Select
                        value={contacto.tipo}
                        onValueChange={(value) => updateContacto(index, "tipo", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="telefono">Teléfono</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="direccion">Dirección</SelectItem>
                          <SelectItem value="horario">Horario</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={contacto.titulo}
                        onChange={(e) => updateContacto(index, "titulo", e.target.value)}
                      />
                </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <Label>Valor</Label>
                      <Input
                        value={contacto.valor}
                        onChange={(e) => updateContacto(index, "valor", e.target.value)}
                      />
                  </div>
                    <div>
                      <Label>Icono</Label>
                      <Input
                        value={contacto.icono}
                        onChange={(e) => updateContacto(index, "icono", e.target.value)}
                        placeholder="phone, mail, message-circle, etc."
                      />
                </div>
                  </div>
                  <div>
                    <Label>URL (opcional)</Label>
                    <Input
                      value={contacto.url}
                      onChange={(e) => updateContacto(index, "url", e.target.value)}
                      placeholder="tel:, mailto:, https://, etc."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={contacto.activo}
                      onCheckedChange={(checked) => updateContacto(index, "activo", checked)}
                    />
                    <Label>Activo</Label>
                </div>
              </div>
              ))}
              {formData.contactos.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay contactos configurados. Agrega el primero.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveContactos} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Guardando..." : "Guardar Contactos"}
                  </Button>
                </div>
        </TabsContent>

        {/* Pestaña Carrusel */}
        <TabsContent value="carrusel" className="space-y-6">
          <Card>
              <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Image className="w-5 h-5 mr-2" />
                  Carrusel de Imágenes
                </div>
                <Button onClick={addCarrusel}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Imagen
                </Button>
              </CardTitle>
              </CardHeader>
            <CardContent className="space-y-4">
              {formData.carrusel.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Imagen {index + 1}</h3>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar imagen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeCarrusel(index)}>
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={item.titulo}
                        onChange={(e) => updateCarrusel(index, "titulo", e.target.value)}
                    />
                  </div>
                    <div>
                      <Label>URL de Imagen</Label>
                      <Input
                        value={item.imagen}
                        onChange={(e) => updateCarrusel(index, "imagen", e.target.value)}
                        placeholder="https://ejemplo.com/imagen.jpg"
                      />
          </div>
        </div>
            <div>
                    <Label>Descripción</Label>
                    <Textarea
                      value={item.descripcion}
                      onChange={(e) => updateCarrusel(index, "descripcion", e.target.value)}
                      rows={2}
                    />
            </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                      <Label>URL de Video (opcional)</Label>
                      <Input
                        value={item.video}
                        onChange={(e) => updateCarrusel(index, "video", e.target.value)}
                        placeholder="https://ejemplo.com/video.mp4"
                      />
            </div>
            <div>
                      <Label>Enlace (opcional)</Label>
                      <Input
                        value={item.enlace}
                        onChange={(e) => updateCarrusel(index, "enlace", e.target.value)}
                        placeholder="https://ejemplo.com"
                      />
            </div>
          </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={item.activo}
                      onCheckedChange={(checked) => updateCarrusel(index, "activo", checked)}
                    />
                    <Label>Activo</Label>
                </div>
              </div>
              ))}
              {formData.carrusel.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay imágenes en el carrusel. Agrega la primera.
            </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveCarrusel} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Guardando..." : "Guardar Carrusel"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
        </div>
  );
} 
