//inside students.js...
//https://marmelab.com/react-admin/Tutorial.html
//need to figure out how to write Filter and needs to be available before you get here

import React from 'react';
import {
	List, 
	Datagrid, 
	TextField, 
	ShowButton, 
	EditButton,
	SimpleForm,
	TextInput,
	Edit,
	Create,
	Filter,
	Show,
	SimpleShowLayout,
} from 'react-admin';

//Remember capitalization, because it is not a native DOM
//filter on 2 things - text input = "id" and source = "id"
const StudentFilter = (props) => (
	<Filter {...props}>
		<TextInput label="id" source="id" alwaysOn />
		<TextInput label="name" source="name" alwaysOn />
	</Filter>
);

export const ListStudents = (props) => (
	<List {...props} filters={<StudentFilter />} bulkActionButtons={false}>
		<Datagrid> 
			<TextField source="id" />
			<TextField source="name" />
			<ShowButton />
			<EditButton />
		</Datagrid>
	</List>
);

export const EditStudents = (props) => (
	<Edit title={"Editing Students!"} {...props}>
		<SimpleForm>
			<TextField source="id" />
			<TextInput source="name" />
		</SimpleForm>
	</Edit>
);

export const CreateStudents = (props) => (
	<Create {...props}>
		<SimpleForm>
			<TextInput source="id" />
			<TextInput source="name" />
		</SimpleForm>
	</Create>
);

export const ShowStudents = (props) => (
	<Show title={"Showing Students!"} {...props}>
		<SimpleShowLayout>
			<TextField source ="id" />
			<TextField source="name"/>
		</SimpleShowLayout>
	</Show>
);
