import * as React from "react"
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SelectField,
  SelectItem,
  CheckboxField,
  RadioGroupField,
  Textarea,
  StatCard,
  SimpleLineChart,
  SimpleBarChart,
  Spinner,
  LoadingOverlay,
  Skeleton,
  EmptyState,
  NoContactsState,
} from "../ui"
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Activity,
  Mail,
  Phone,
  Calendar
} from "lucide-react"

const DesignSystemShowcase: React.FC = () => {
  const [loading, setLoading] = React.useState(false)
  const [selectedValue, setSelectedValue] = React.useState("")
  const [checkboxChecked, setCheckboxChecked] = React.useState(false)
  const [radioValue, setRadioValue] = React.useState("")

  // Sample data for charts
  const chartData = [
    { name: "Jan", value: 400 },
    { name: "Feb", value: 300 },
    { name: "Mar", value: 600 },
    { name: "Apr", value: 800 },
    { name: "May", value: 500 },
    { name: "Jun", value: 700 },
  ]

  const tableData = [
    { id: 1, name: "John Doe", email: "john@example.com", status: "active" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", status: "inactive" },
    { id: 3, name: "Bob Johnson", email: "bob@example.com", status: "pending" },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">ACE CRM Design System</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          A comprehensive collection of reusable UI components built with React, TypeScript, 
          Tailwind CSS, and Radix UI for enterprise CRM applications.
        </p>
      </div>

      {/* Buttons Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Buttons</h2>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button loading>Loading</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Forms Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Form Components</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                leftIcon={<Mail className="h-4 w-4" />}
              />
              
              <Input
                label="Phone Number"
                placeholder="Enter phone number"
                leftIcon={<Phone className="h-4 w-4" />}
                helperText="Include country code"
              />

              <SelectField
                label="Country"
                placeholder="Select country"
                value={selectedValue}
                onValueChange={setSelectedValue}
              >
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="ca">Canada</SelectItem>
                <SelectItem value="uk">United Kingdom</SelectItem>
              </SelectField>

              <CheckboxField
                label="Subscribe to newsletter"
                description="Get updates about new features and releases"
                checked={checkboxChecked}
                onCheckedChange={setCheckboxChecked}
              />

              <RadioGroupField
                label="Contact Method"
                value={radioValue}
                onValueChange={setRadioValue}
                options={[
                  { value: "email", label: "Email" },
                  { value: "phone", label: "Phone" },
                  { value: "sms", label: "SMS" }
                ]}
              />

              <Textarea
                label="Notes"
                placeholder="Add any additional notes..."
                rows={3}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Form Validation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Required Field"
                error="This field is required"
                placeholder="This shows an error"
              />
              
              <Input
                label="Valid Field"
                placeholder="This field is valid"
                helperText="All good!"
              />

              <SelectField
                label="Select with Error"
                placeholder="Select an option"
                error="Please select an option"
              >
                <SelectItem value="1">Option 1</SelectItem>
                <SelectItem value="2">Option 2</SelectItem>
              </SelectField>

              <CheckboxField
                label="Accept terms"
                error="You must accept the terms"
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Dashboard Cards */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Dashboard Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Contacts"
            value="2,435"
            trend={{ value: 12.5, isPositive: true }}
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            title="Revenue"
            value="$45,231"
            trend={{ value: 8.2, isPositive: true }}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <StatCard
            title="Conversion Rate"
            value="3.24%"
            trend={{ value: 2.1, isPositive: false }}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <StatCard
            title="Active Deals"
            value="145"
            trend={{ value: 5.7, isPositive: true }}
            icon={<Activity className="h-4 w-4" />}
          />
        </div>
      </section>

      {/* Charts Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Charts & Visualizations</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SimpleLineChart
            title="Revenue Trend"
            description="Monthly revenue over time"
            data={chartData}
            dataKey="value"
            xKey="name"
            height={300}
          />
          <SimpleBarChart
            title="Leads by Source"
            description="Lead generation by channel"
            data={chartData}
            dataKey="value"
            xKey="name"
            height={300}
          />
        </div>
      </section>

      {/* Alerts Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Alerts & Feedback</h2>
        <div className="space-y-4">
          <Alert>
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>
              This is a default alert for general information.
            </AlertDescription>
          </Alert>
          
          <Alert variant="success">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              Your changes have been saved successfully.
            </AlertDescription>
          </Alert>
          
          <Alert variant="warning">
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Please review your settings before proceeding.
            </AlertDescription>
          </Alert>
          
          <Alert variant="destructive" dismissible>
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              There was a problem processing your request.
            </AlertDescription>
          </Alert>
        </div>
      </section>

      {/* Badges Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Badges & Status</h2>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="destructive">Error</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Loading States */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Loading States</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Spinners</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
              <Spinner variant="primary" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Skeletons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Table Section */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Data Tables</h2>
        <Card>
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>
                      <Badge variant={
                        row.status === "active" ? "success" : 
                        row.status === "inactive" ? "secondary" : 
                        "warning"
                      }>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost">Edit</Button>
                        <Button size="sm" variant="ghost">Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* Empty States */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Empty States</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <NoContactsState
            onAddContact={() => console.log('Add contact clicked')}
          />
          <EmptyState
            title="No results found"
            description="Try adjusting your search or filter criteria."
            action={{
              label: "Clear Filters",
              onClick: () => console.log('Clear filters clicked')
            }}
            variant="search"
          />
        </div>
      </section>

      {/* Loading Overlay Demo */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Loading Overlay</h2>
        <Card>
          <CardHeader>
            <CardTitle>Loading Overlay Demo</CardTitle>
            <CardDescription>
              Click the button to see the loading overlay in action
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                onClick={() => {
                  setLoading(true)
                  setTimeout(() => setLoading(false), 2000)
                }}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Trigger Loading'}
              </Button>
              
              <LoadingOverlay loading={loading} message="Processing your request...">
                <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Content that gets overlaid</p>
                </div>
              </LoadingOverlay>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

export default DesignSystemShowcase