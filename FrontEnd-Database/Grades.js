import React from 'react';
import {
	List,
	Datagrid,
	TextField,
	TextInput,
	Edit,
	Create,
	Filter,
	ShowButton,
	EditButton,
	DisabledInput,
	SimpleForm,
	Show,
	SimpleShowLayout,
	NumberInput,
	NumberField,
} from 'react-admin';

const GradeFilter = (props) => (
	<Filter {...props}>
		<TextInput source = "studentId" />
		<TextInput source = "type" />
		<NumberInput source = "grade" />
		<NumberInput source = "max" />
	</Filter>
);

export const ListGrades = (props) => (
	<List {...props} filters={<GradeFilter />} bulkActionButtons={false}>
		<Datagrid>
			<TextField source = "studentId" />
			<TextField source = "type" />
			<NumberField source = "grade" />
			<NumberField source = "max" />
			<ShowButton />
			<EditButton />
		</Datagrid>
	</List>
);

export const EditGrades = (props) => (
	<Edit title={"Editing Grades!"} {...props} >
		<SimpleForm>
			<DisabledInput label="id" source="id" />
			<TextInput source = "studentId" />
			<TextInput source = "type" />
			<NumberInput source = "grade" />
			<NumberInput source = "max" />
		</SimpleForm>
	</Edit>
);

export const CreateGrades = (props) => (
	<Create {...props}>
		<SimpleForm>
			<TextInput source = "studentId" />
			<TextInput source = "type" />
			<NumberInput source = "grade" />
			<NumberInput source = "max" />
		</SimpleForm>
	</Create>
);

export const ShowGrades = (props) => (
	<Show title={"Showing Grades!"} {...props}>
		<SimpleShowLayout>
			<TextField source = "studentId" />
			<TextField source = "type" />
			<NumberField source = "grade" />
			<NumberField source = "max" />
		</SimpleShowLayout>
	</Show>
);
